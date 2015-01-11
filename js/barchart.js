$(function() {
    resize();
    redraw();

    $(window).resize(function() {
        resize();
        redraw();
    });
});


function resize() {
    var w = $(window);
    var b = $("body");
    b.width(w.width()
            - parseInt(b.css("margin-left"))
            - parseInt(b.css("margin-right"))
            - parseInt(b.css("padding-left"))
            - parseInt(b.css("padding-right"))
           );
    b.height(w.height()
             - parseInt(b.css("margin-top"))
             - parseInt(b.css("margin-bottom"))
             - parseInt(b.css("padding-top"))
             - parseInt(b.css("padding-bottom"))
            );

    var g = $("#graphic");
    var gp = g.parent();
    g.attr("width", gp.width());
    g.attr("height", gp.height());
}


function redraw() {
    $("#graphic").empty();
    $(".d3-tip").remove();

    var width = $("#graphic").innerWidth();
    var height = $("#graphic").innerHeight();

    var tip_pad = 6;
    var bar_pad = 4;
    var row_pad = 10;
    var name_pad = 22;
    var axis_pad = 0;

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

            return [2, offset_x];
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

    d3.tsv("picks.tsv", function(picks) {
        var players_map = {};

        picks.forEach(function(pick) {
            pick.confidence = +pick.Confidence_Score;

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

        var num_games = picks.reduce(function(running, pick) { return Math.max(running, pick.confidence); }, 0);

        var players = Object.keys(players_map).map(function(p) { return players_map[p]; });
        var num_players = players.length;

        var max_bar_height = height / num_players - row_pad;
        var bar_width = (width - (num_games - 1) * bar_pad) / num_games;

        var names = svg.selectAll(".name")
            .data(players)
            .enter()
            .append("text")
            .classed("name", true)
            .attr("x", 0)
            .attr("y", function(d) { return height * (d.rank - 1) / num_players + max_bar_height - name_pad; })
            .text(function(d) { return d.name + ": " + d.score; })
            ;

        var bars = svg.selectAll(".bar")
            .data(picks)
            .enter()
            .append("rect")
            .classed("bar", true)
            .attr("x", function(d) { return (d.confidence - 1) * (width / num_games); })
            .attr("y", function(d) { return height * (d.rank - 1) / num_players + max_bar_height; })
            .attr("width", bar_width)
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
                d3.selectAll(".highlight")
                    .attr("r", function(d) {
                        if (bar_data.pick == d.pick) return 3;
                        return 4;
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
                d3.selectAll(".highlight")
                    .classed("matching", false)
                    .classed("nonmatching", false)
                ;
            })
            .transition()
            .delay(function(d) { return 50 * d.confidence; })
            .duration(function(d) { return 250; })
            .attr("y", function(d) { return height * (d.rank - 1) / num_players + max_bar_height - d.confidence / num_games * max_bar_height; })
            .attr("height", function(d) { return d.confidence / num_games * max_bar_height; })
            ;

        var highlights = svg.selectAll(".highlight")
            .data(picks)
            .enter()
            .append("circle")
            .classed("highlight", true)
            .attr("cx", function(d) { return (d.confidence - 1) * (width / num_games) + bar_width / 2; })
            .attr("cy", function(d) { return height * (d.rank - 1) / num_players + max_bar_height + 4; })
            ;
    });
}
