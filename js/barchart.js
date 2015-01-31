// Wrap everything in an IIFE (immediately-invokde function expression) to avoid
// polluting the global namespace.
(function() {

    var picks;
    var players;
    var num_games;
    var num_players;
    var rows;
    var cols;

    var tip_offset_y = 2;
    var col_pad = 4;
    var row_pad = 10;
    var name_offset_y = -15;
    var bottom_margin = 14;
    var highlight_size_matching = 3;
    var highlight_size_nonmatching = 4;
    var legend_label_offset = 10;
    var legend_symbol_pad = 4;

    var sort_method = "confidence";
    var color_scheme = "dark";


    $(function() {
        set_layout_sizes();
        set_color_scheme(color_scheme);

        d3.tsv("picks.tsv", function(pick_data) {
            picks = pick_data;
            var players_map = {};

            picks.forEach(function(pick) {
                pick.confidence = +pick.Confidence_Score;
                pick.game_order = +pick.game_order;

                if (pick.correct === "1") pick.result = true;
                else if (pick.correct === "0") pick.result = false;
                else pick.result = null;

                if (!(pick.name in players_map)) {
                    players_map[pick.name] = {};
                    players_map[pick.name].score = 0;
                }
                var p = players_map[pick.name];
                p.name = pick.name;
                p.rank = +pick.rank;
                p.score += +pick.score;
            });

            num_games = picks.reduce(function(running, pick) { return Math.max(running, pick.confidence); }, 0);

            players = Object.keys(players_map).map(function(p) { return players_map[p]; });
            num_players = players.length;

            draw_graphic();
        });

        $(window).resize(function() {
            set_layout_sizes();
            draw_graphic();
        });

        $("#sort-confidence").click(function() {
            if (sort_method == "confidence") return;
            set_sort_method("confidence");
            reposition_bars();
        });

        $("#sort-game").click(function() {
            if (sort_method == "game") return;
            set_sort_method("game");
            reposition_bars();
        });

        $("#color-light").click(function() {
            if (color_scheme == "light") return;
            set_color_scheme("light");
        });

        $("#color-dark").click(function() {
            if (color_scheme == "dark") return;
            set_color_scheme("dark");
        });

        $("#help-control").click(function() {
            $("#help").fadeToggle();
        });

        $("#help #close").click(function() {
            $("#help").fadeOut();
        });
    });


    function set_layout_sizes() {
        var w = $(window);
        var b = $("body");
        b.height(w.height()
                 - parseInt(b.css("margin-top"))
                 - parseInt(b.css("margin-bottom"))
                 - parseInt(b.css("padding-top"))
                 - parseInt(b.css("padding-bottom"))
                );

        var h = $("#header");

        var g = $("#graphic");
        g.attr("width", b.width());
        g.attr("height", b.height() - h.outerHeight(true));
    }


    function draw_graphic() {
        $("#graphic").empty();
        $(".d3-tip").remove();

        var width = $("#graphic").innerWidth();
        var height = $("#graphic").innerHeight();

        // Compute the positions for each row and column. There will be one row
        // per player and one column per game. They will maximize the available
        // space, with the exception of a little extra space at the bottom to
        // fit the tooltip on the bottom row.

        var row_height = (height - bottom_margin - (num_players - 1) * row_pad) / num_players;
        var col_width = (width - (num_games - 1) * col_pad) / num_games;

        rows = [];
        rows.push({});  // dummy element to support 1-based indexing later
        d3.range(num_players).forEach(function(i) {
            var row = {};
            row.height = row_height;
            row.top = i * (row_height + row_pad);
            row.bottom = row.top + row.height;
            row.middle = (row.top + row.bottom) / 2;
            rows.push(row);
        });

        cols = [];
        cols.push({});  // dummy element to support 1-based indexing later
        d3.range(num_games).forEach(function(i) {
            var col = {};
            col.width = col_width;
            col.left = i * (col_width + col_pad);
            col.right = col.left + col.width;
            col.middle = (col.left + col.right) / 2;
            cols.push(col);
        });

        var svg = d3.select("#graphic");

        var tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset(function(d) {
                var tw = parseInt(d3.select(".d3-tip").style("width"));
                var cx = parseInt(d3.select(this).attr("x")) + parseInt(d3.select(this).attr("width")) / 2;
                var sw = parseInt(d3.select("#graphic").attr("width"));

                var offset_x = 0;
                if (tw/2 > cx) offset_x = tw/2 - cx;
                else if (cx + tw/2 > sw) offset_x = sw - (cx + tw/2);

                return [tip_offset_y, offset_x];
            })
            .direction("s")
            .html(function(d) {
                var pick_class = "pick_future";
                if (d.result == true) pick_class = "pick_right";
                else if (d.result == false) pick_class = "pick_wrong";
                var matchup = d.MATCHUP.replace("Semifinal winners", "Semifinal winners: " + d.pick);
                matchup = matchup.replace(d.pick, "<span class=\"" + pick_class + "\">" + d.pick + "</span>");
                return d.name + " [" + d.confidence + "]: " + matchup + ", " + d.game_time;
            });

        svg.call(tip);

        set_sort_method(sort_method);

        var bars = svg.selectAll(".bar")
            .data(picks)
            .enter()
            .append("rect")
            .classed("bar", true)
            .attr("x", function(d) { return d.bar_left; })
            .attr("y", function(d) { return rows[d.rank].middle; })
            .attr("width", function(d) { return d.bar_width; })
            .attr("height", 0)
            .attr("rx", 4)
            .attr("ry", 4)
            .classed("right", function(d) { return d.result === true; })
            .classed("wrong", function(d) { return d.result === false; })
            .classed("unplayed", function(d) { return d.result === null; })
            .on('mouseover.1',
                // tip.show doesn't work when it's called inside a function.
                // Therefore, it needs to be added as a separate event handler. d3
                // lets you assign multiple handlers to an event by adding an
                // extension to the event name. Here, we've added .1, .2 to the
                // mouseover event name.
                tip.show
               )
            .on('mouseover.2', function() {
                var bar_data = d3.select(this).data()[0];
                d3.selectAll("#graphic .highlight")
                    .attr("r", function(d) {
                        if (bar_data.pick == d.pick) return highlight_size_matching;
                        return highlight_size_nonmatching;
                    })
                    .classed("matching", function(d) {
                        return (bar_data.MATCHUP == d.MATCHUP
                                && bar_data.pick == d.pick
                                && bar_data.name != d.name
                               );
                    })
                    .classed("nonmatching", function(d) {
                        return (bar_data.MATCHUP == d.MATCHUP
                                && bar_data.pick != d.pick
                                && bar_data.name != d.name
                               );
                    })
                ;
            })
            .on('mouseout.1',
                // See the comments for tip.show in mouseover.1
                tip.hide
               )
            .on('mouseout.2', function() {
                d3.selectAll("#graphic .highlight")
                    .classed("matching", false)
                    .classed("nonmatching", false)
                ;
            })
            .transition()
            .delay(function(d) { return 1000 * (d.rank - 1) / num_players + 25 * (sort_method == "game" ? d.game_order : d.confidence); })
            .duration(function(d) { return 250; })
            .attr("y", function(d) { return d.bar_top; })
            .attr("height", function(d) { return d.bar_height; })
        ;

        var highlights = svg.selectAll(".highlight")
            .data(picks)
            .enter()
            .append("circle")
            .classed("highlight", true)
            .attr("cx", function(d) { return d.bar_hcenter; })
            .attr("cy", function(d) { return d.bar_bottom + 4; })
        ;

        var names = svg.selectAll(".name")
            .data(players)
            .enter()
            .append("g")
            .classed("name_group", true)
            .append("text")
            .classed("name", true)
            .attr("x", 0)
            .attr("y", function(d) { return rows[d.rank].middle + name_offset_y; })
        // dominant-baseline=hanging puts the top of the text at the y-coord.
        //.attr("dominant-baseline", "hanging")
            .text(function(d) { return d.name + ": " + d.score; })
        ;

        // Place a rectangle behind the names to give them some contrast when
        // they overlap bars. This must be defined after the names, because it
        // uses the names variable. However, the background rect element must be
        // defined before the the name text element in the svg, because
        // otherwise the background would be displayed on top of the name. Use
        // the d3.insert function to insert the background rect elements before
        // the name text elements. For the d3.insert function to work, we need
        // the name and its background to be defined within a group (which is
        // probably a good idea anyway).

        var name_bgs = svg.selectAll(".name_group")
            .insert("rect", ".name")
            .classed("name_bg", true)
            .attr("x", function(d, i) { return names[0][i].getBBox().x - 2; })
            .attr("y", function(d, i) { return names[0][i].getBBox().y - 2; })
            .attr("width", function(d, i) { return names[0][i].getBBox().width + 4; })
            .attr("height", function(d, i) { return names[0][i].getBBox().height + 4; })
        ;

        // Make the elements in the legend look like the ones in the graphic.

        var legend_symbol_width = cols[1].width
        var legend_symbol_height = rows[1].height / 2

        var legend = d3.select("#legend");

        legend.attr("height", 5 * legend_symbol_height);

        legend.selectAll(".bar")
            .attr("x", 0)
            .attr("y", function(d, i) { return i * legend_symbol_height + legend_symbol_pad/2 })
            .attr("width", legend_symbol_width)
            .attr("height", legend_symbol_height - legend_symbol_pad)
            .attr("rx", 4)
            .attr("ry", 4)
        ;

        legend.selectAll(".highlight")
            .attr("cx", legend_symbol_width/2)
        ;

        // The cy attribute assumes the matching highlight symbol is the 4th one
        // in the list.
        legend.select(".highlight.matching")
            .attr("cy", (3 + 1/2) * legend_symbol_height)
            .attr("r", highlight_size_matching)
        ;

        // The cy attribute assumes the nonmatching highlight symbol is the 5th
        // one in the list.
        legend.select(".highlight.nonmatching")
            .attr("cy", (4 + 1/2) * legend_symbol_height)
            .attr("r", highlight_size_nonmatching)
        ;

        legend.selectAll(".label")
            .attr("x", legend_symbol_width + legend_label_offset)
            .attr("y", function(d, i) { return (i + 1/2) * legend_symbol_height })
            .attr("dominant-baseline", "central")
        ;
    }


    function assign_bar_dimensions(pick, row, col) {    
        pick.bar_left = cols[col].left;
        pick.bar_right = cols[col].right;
        pick.bar_width = cols[col].width;
        pick.bar_hcenter = cols[col].middle;

        pick.bar_height = (pick.confidence / num_games) * rows[row].height;
        pick.bar_top = rows[row].middle - pick.bar_height / 2;
        pick.bar_bottom = rows[row].middle + pick.bar_height / 2;
        pick.bar_vcenter = rows[row].middle;
    }

    function reposition_bars() {
        d3.selectAll(".bar")
            .data(picks)
            .transition()
            .delay(function(d) { return 1000 * (d.rank - 1) / num_players; })
            .duration(function(d) { return 1000; })
            .attr("x", function(d) { return d.bar_left; })
        ;

        d3.selectAll(".highlight")
            .data(picks)
            .transition()
            .delay(2000)
            .duration(0)
            .attr("cx", function(d) { return d.bar_hcenter; })
        ;
    }

    function set_sort_method(method) {
        sort_method = method;

        if (method == "game") {
            d3.select("#sort-game").classed("active", true);
            d3.select("#sort-confidence").classed("active", false);
        }
        else {
            d3.select("#sort-confidence").classed("active", true);
            d3.select("#sort-game").classed("active", false);
        }

        picks.forEach(function(pick) {
            if (method == "game") {
                assign_bar_dimensions(pick, pick.rank, pick.game_order);
            }
            else {
                assign_bar_dimensions(pick, pick.rank, pick.confidence);
            }
        });
    }

    function set_color_scheme(scheme) {
        color_scheme = scheme;

        if (scheme == "light") {
            d3.select("#color-light").classed("active", true);
            d3.select("#color-dark").classed("active", false);
        }
        else {
            d3.select("#color-dark").classed("active", true);
            d3.select("#color-light").classed("active", false);
        }

        d3.select("body")
            .classed("color-light", scheme == "light")
            .classed("color-dark", scheme == "dark")
        ;
    };

})();
