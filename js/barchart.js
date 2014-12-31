var width = window.innerWidth - 20;
var height = window.innerHeight - 20;

var tip_pad = 6;
var bar_pad = 4;
var row_pad = 10;
var name_pad = 14;
var axis_pad = 0;

var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset(function(d) {
        var tw = parseInt(d3.select(".d3-tip").style("width"));
        var th = parseInt(d3.select(".d3-tip").style("height"));

        var cx = parseInt(d3.select(this).attr("x")) + parseInt(d3.select(this).attr("width")) / 2;
        var cy = parseInt(d3.select(this).attr("y"));

        var sw = parseInt(d3.select("svg").attr("width"));

        var offset_x = 0;
        if (tw/2 > cx) offset_x = tw/2 - cx;
        else if (cx + tw/2 > sw) offset_x = sw - (cx + tw/2);

        var offset_y = -tip_pad;
        if (th + tip_pad > cy) offset_y = tip_pad;
       
        return [offset_y, offset_x];
    })
    .direction(function(d) {
        var th = parseInt(d3.select(".d3-tip").style("height"));
        var cy = parseInt(d3.select(this).attr("y"));

        if (th + tip_pad > cy) return "s";
        return "n";
    })
    .html(function(d) {
        var pick_class = "pick_future";
        if (d.result == true) pick_class = "pick_right";
        else if (d.result == false) pick_class = "pick_wrong";
        var matchup = d.MATCHUP.replace("Semifinal winners", "Semifinal winners: " + d.pick);
        matchup = matchup.replace(d.pick, "<span class=\"" + pick_class + "\">" + d.pick + "</span>");
        return "<h1>" + d.name + ": " + d.Confidence_Score + "</h2><p>" + matchup + "</p><p>" + d.game_time + "</p>";
    });

svg.call(tip);

d3.tsv("picks.tsv", function(rows) {
    var players_map = {};

    rows.forEach(function(row) {
        row.confidence = +row.Confidence_Score;

        if (row.correct === "1") row.result = true;
        else if (row.correct === "0") row.result = false;
        else row.result = null;

        if (!(row.name in players_map)) {
            players_map[row.name] = {};
            players_map[row.name].score = 0;
        }
        var p = players_map[row.name];
        p.name = row.name;
        p.rank = +row.rank;
        p.score += +row.score;
    });

    var num_games = rows.reduce(function(running, row) { return Math.max(running, row.confidence); }, 0);

    var players = Object.keys(players_map).map(function(p) { return players_map[p]; });
    var num_players = players.length;

    var max_bar_height = height / num_players - row_pad;
    var bar_width = (width - (num_games - 1) * bar_pad) / num_games;

    var names = svg.selectAll("text")
        .data(players)
        .enter()
        .append("text")
        .attr("x", 0)
        .attr("y", function(d) { return height * (d.rank - 1) / num_players + max_bar_height - name_pad; })
        .attr("font-family", "sans-serif")
        .attr("font-size", "16px")
        .attr("fill", "rgb(224, 224, 224)")
        .text(function(d) { return d.name + ": " + d.score; })
        ;

    var bars = svg.selectAll("rect")
        .data(rows)
        .enter()
        .append("rect")
        .attr("x", function(d) { return (d.confidence - 1) * (width / num_games); })
        .attr("y", function(d) { return height * (d.rank - 1) / num_players + max_bar_height; })
        .attr("width", bar_width)
        .attr("height", 0)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", function(d) {
            //if (d.result === true) return "rgb(31, 78, 121)";
            if (d.result === true) return "rgb(0, 96, 0)";

            if (d.result === false) return "rgb(112, 112, 112)";
            // if (d.result === false) return "rgb(224, 96, 0)";
            // if (d.result === false) return "rgb(96, 0, 0)";

            // return "rgb(255, 255, 255)";
            // return "rgb(0, 0, 0)";
            return "rgb(24, 24, 24)";
        })
        .on('mouseover.1', tip.show)
        .on('mouseover.2', function() {
            var bar_data = d3.select(this).data()[0];
            highlights
                .style("display", function(d) {
                    if (bar_data.MATCHUP == d.MATCHUP && bar_data.name != d.name) return "block";
                    return "none";
                });
        })
        .on('mouseout.1', tip.hide)
        .on('mouseout', function() {
            highlights
                .style("display", "none");
        })
        .transition()
        .delay(function(d) { return 50 * d.confidence; })
        .duration(function(d) { return 250; })
        .attr("y", function(d) { return height * (d.rank - 1) / num_players + max_bar_height - d.confidence / num_games * max_bar_height; })
        .attr("height", function(d) { return d.confidence / num_games * max_bar_height; })
        ;

    var highlights = svg.selectAll("circle")
        .data(rows)
        .enter()
        .append("circle")
        .attr("cx", function(d) { return (d.confidence - 1) * (width / num_games) + bar_width / 2; })
        .attr("cy", function(d) { return height * (d.rank - 1) / num_players + max_bar_height + 3; })
        .attr("r", 3)
        .attr("fill", "rgb(156, 83, 22)")
        .style("display", "none")
        ;
});
