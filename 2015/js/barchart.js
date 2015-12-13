d3.tsv("data/picks.tsv", function(picks) {
    //--------------------------------------------------------------------------
    // Prep the data.

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

    var players = d3.values(players_map);
    var num_players = players.length;
    var num_games = d3.max(picks, function(p) { return p.confidence; });


    //--------------------------------------------------------------------------
    // Define UI options.

    var tip_offset_y = 2;
    var name_offset_y = -15;
    var highlight_size_matching = 3;
    var highlight_size_nonmatching = 4;
    var legend_label_offset = 10;
    var legend_symbol_pad = 4;

    var sort_method = "confidence";
    var color_scheme = "light";

    set_color_scheme(color_scheme);


    //--------------------------------------------------------------------------
    // Create the SVG using the margin convention for sizing/positioning. We
    // want the SVG to occupy all the space on screen below the header.

    // Initialize the state of the header elements. Their presence/absence could
    // affect the height of the header.
    $("#help-hide").hide();
    update_sort_method_selector();
    update_color_scheme_selector();

    var margin = {
        top: 0,
        right: 0,
        bottom: 14,
        left: 0
    };

    var svgWidth = $('body').width();
    var svgHeight = $('body').height() - $('#header').outerHeight(true);

    var width = svgWidth - margin.left - margin.right;
    var height = svgHeight - margin.top - margin.bottom;

    var svg = d3.select('#graphic')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    ;


    //--------------------------------------------------------------------------
    // Define the tooltips.

    var tip = d3.tip()
        .attr('class', 'd3-tip')
        .offset(function(d) {
            var svgBoundingBox = svg.node().getBoundingClientRect();
            var targetBoundingBox = this.getBoundingClientRect();

            var tipWidth = parseInt(d3.select(".d3-tip").style("width"));
            var tipCenterX = targetBoundingBox.left + targetBoundingBox.width/2;
            var tipMinX = svgBoundingBox.left;
            var tipMaxX = svgBoundingBox.right;

            var offset_x = 0;

            if (tipCenterX - tipWidth / 2 < tipMinX) {
                offset_x = tipMinX + tipWidth / 2 - tipCenterX;
            }
            else if (tipCenterX + tipWidth / 2 > tipMaxX) {
                offset_x = tipMaxX - (tipCenterX + tipWidth / 2);
            }

            return [tip_offset_y, offset_x];
        })
        .direction("s")
        .html(function(d) {
            var pick_class = "pick_future";
            if (d.result === true) pick_class = "pick_right";
            else if (d.result === false) pick_class = "pick_wrong";
            var matchup = d.MATCHUP.replace("Semifinal winners", "Semifinal winners: " + d.pick);
            matchup = matchup.replace(d.pick, "<span class=\"" + pick_class + "\">" + d.pick + "</span>");
            return d.name + " [" + d.confidence + "]: " + matchup + ", " + d.game_time;
        });

    svg.call(tip);


    //--------------------------------------------------------------------------
    // Draw the visualization.

    var xScale = d3.scale.ordinal()
        .domain(d3.range(1, num_games + 1))
        .rangeBands([0, width], 0.1, 0)
    ;

    var yScale = d3.scale.ordinal()
        .domain(d3.range(1, num_players + 1))
        .rangeBands([0, height], 0.1, 0)
    ;

    var barHeightScale = d3.scale.linear()
        .domain([0, num_games])
        .range([0, yScale.rangeBand()])
    ;

    var barGroups = svg.selectAll('.bar-group')
        .data(picks)
        .enter()
        .append('g')
        .classed('bar-group', true)
        .attr('transform', function(d) {
            return 'translate(' + xScale(d[sort_method]) + ',' + yScale(players_map[d.name].rank) + ')';
        })
        .attr('opacity', 0)
    ;

    barGroups.transition()
        .delay(function(d) {
            return 1000 * (d.rank - 1) / num_players + 25 * (sort_method == "game_order" ? d.game_order : d.confidence);
        })
        .duration(function(d) {
            return 250;
        })
        .attr('opacity', 1)
    ;

    barGroups.append('rect')
        .classed("bar", true)
        .classed("right", function(d) {
            return d.result === true;
        })
        .classed("wrong", function(d) {
            return d.result === false;
        })
        .classed("unplayed", function(d) {
            return d.result === null;
        })
        .attr('x', 0)
        .attr('y', function(d) {
            return yScale.rangeBand()/2 - barHeightScale(d.confidence)/2;
        })
        .attr('width', xScale.rangeBand())
        .attr('height', function(d) {
            return barHeightScale(d.confidence);
        })
        .attr("rx", 4)
        .attr("ry", 4)
        .on('mouseover.1',
            // We want to let d3 handle the call to tip.show, because it
            // passes certain arguments to it and sets up the /this/ context
            // appropriately. Because we have additional code to run on
            // mouseover, we'll need to assign two event handlers: one where
            // we pass the tip.show function, and one where we define a
            // function for our additional code. d3 lets you assign multiple
            // handlers to an event by adding an extension to the event
            // name. Here, we've added .1, .2 to the mouseover event name.
            //
            // We could do this in a single handler by calling tip.show
            // explicitly in the same way d3 does. This seems to work
            // currently:
            //
            //   tip.show.call(this, d)
            //
            // However, we don't want to be responsible for updating this to
            // match any changes to what d3 is doing internally.
            tip.show
           )
        .on('mouseover.2', function(d) {
            var thisBar = d;

            d3.selectAll("#graphic .highlight")
                .attr("r", function(otherBar) {
                    if (thisBar.pick == otherBar.pick) return highlight_size_matching;
                    return highlight_size_nonmatching;
                })
                .classed("matching", function(otherBar) {
                    return (thisBar.MATCHUP == otherBar.MATCHUP
                            && thisBar.pick == otherBar.pick
                            && thisBar.name != otherBar.name
                           );
                })
                .classed("nonmatching", function(otherBar) {
                    return (thisBar.MATCHUP == otherBar.MATCHUP
                            && thisBar.pick != otherBar.pick
                            && thisBar.name != otherBar.name
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
    ;

    barGroups.append('circle')
        .classed('highlight', true)
        .attr('cx', xScale.rangeBand()/2)
        .attr('cy', function(d) {
            return yScale.rangeBand()/2 + barHeightScale(d.confidence)/2 + 4;
        })
    ;

    var nameGroups = svg.selectAll(".name")
        .data(players)
        .enter()
        .append("g")
        .classed("name-group", true)
    ;

    var names = nameGroups.append("text")
        .classed("name", true)
        .attr("x", 0)
        .attr("y", function(d) {
            return yScale(players_map[d.name].rank) + yScale.rangeBand()/2 + name_offset_y;
        })
        // dominant-baseline=hanging puts the top of the text at the y-coord.
        //.attr("dominant-baseline", "hanging")
        .text(function(d) {
            return d.name + ": " + d.score;
        })
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

    nameGroups.insert("rect", ".name")
        .classed("name_bg", true)
        .attr("x", function(d, i) {
            return names[0][i].getBBox().x - 2;
        })
        .attr("y", function(d, i) {
            return names[0][i].getBBox().y - 2;
        })
        .attr("width", function(d, i) {
            return names[0][i].getBBox().width + 4;
        })
        .attr("height", function(d, i) {
            return names[0][i].getBBox().height + 4;
        })
    ;


    //--------------------------------------------------------------------------
    // Make the elements in the legend look like the ones in the graphic.

    var legend_symbol_width = xScale.rangeBand();
    var legend_symbol_height = yScale.rangeBand() / 2;

    var legend = d3.select("#legend");

    legend.attr("height", 5 * legend_symbol_height);

    legend.selectAll(".bar")
        .attr("x", 0)
        .attr("y", function(d, i) { return i * legend_symbol_height + legend_symbol_pad/2; })
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
        .attr("y", function(d, i) { return (i + 1/2) * legend_symbol_height; })
        .attr("dominant-baseline", "central")
    ;


    //--------------------------------------------------------------------------
    // Define event handlers.

    $("#sort-confidence").click(function() {
        if (sort_method == "confidence") return;
        set_sort_method("confidence");
        update_sort_method_selector();
        reposition_bars();
    });

    $("#sort-game").click(function() {
        if (sort_method == "game_order") return;
        set_sort_method("game_order");
        update_sort_method_selector();
        reposition_bars();
    });

    $("#color-light").click(function() {
        if (color_scheme == "light") return;
        set_color_scheme("light");
        update_color_scheme_selector();
    });

    $("#color-dark").click(function() {
        if (color_scheme == "dark") return;
        set_color_scheme("dark");
        update_color_scheme_selector();
    });

    $("#help-show").click(function() {
        $("#help").fadeIn();
        $("#help-show").hide();
        $("#help-hide").show();
    });

    $("#help-hide").click(function() {
        $("#help").fadeOut();
        $("#help-hide").hide();
        $("#help-show").show();
    });

    $("#help #close").click(function() {
        $("#help").fadeOut();
        $("#help-hide").hide();
        $("#help-show").show();
    });


    //--------------------------------------------------------------------------
    // Function definitions.

    function reposition_bars() {
        d3.selectAll('#graphic .bar-group')
            .transition()
            .delay(function(d) {
                return 1000 * (d.rank - 1) / num_players;
            })
            .duration(function(d) {
                return 1000;
            })
            .attr('transform', function(d) {
                return 'translate(' + xScale(d[sort_method]) + ',' + yScale(players_map[d.name].rank) + ')';
            })
        ;
    }

    function set_sort_method(method) {
        sort_method = method;
    }

    function update_sort_method_selector() {
        if (sort_method == "game_order") {
            $("#sort-game").hide();
            $("#sort-confidence").show();
        }
        else {
            $("#sort-confidence").hide();
            $("#sort-game").show();
        }
    }

    function set_color_scheme(scheme) {
        color_scheme = scheme;

        d3.select("body")
            .classed("color-light", scheme == "light")
            .classed("color-dark", scheme == "dark")
        ;
    }

    function update_color_scheme_selector() {
        if (color_scheme == "light") {
            $("#color-light").hide();
            $("#color-dark").show();
        }
        else {
            $("#color-dark").hide();
            $("#color-light").show();
        }
    }
});
