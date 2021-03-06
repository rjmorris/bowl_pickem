var width = window.innerWidth - 20;
var height = window.innerHeight - 20;

var tip_pad = 6;

var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset(function(d) {
        var tw = parseInt(d3.select(".d3-tip").style("width"));
        var th = parseInt(d3.select(".d3-tip").style("height"));

        var cx = parseInt(d3.select(this).attr("cx"));
        var cy = parseInt(d3.select(this).attr("cy"));

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
        var cy = parseInt(d3.select(this).attr("cy"));

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
    var num_games = rows.reduce(function(running, row) { return Math.max(running, +row.Confidence_Score); }, 0);
    var num_players = rows.reduce(function(running, row) { return Math.max(running, +row.rank); }, 0);

    var circle_data = [];
    var cum_diameter = 0;
    for (var area in d3.range(num_games + 1)) {
        circle_data[area] = {};
        var d = circle_data[area];
        d.radius = Math.sqrt(area / Math.PI);
        d.diameter = 2 * d.radius;
        cum_diameter = cum_diameter + d.diameter;
        d.cum_diameter = cum_diameter;
    }

    var players_map = {};

    rows.forEach(function(row) {
        row.area = +row.Confidence_Score;
        row.radius = circle_data[row.area].radius;
        row.diameter = 2 * row.radius;
        row.cum_diameter = circle_data[row.area].cum_diameter;

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

    var players = Object.keys(players_map).map(function(p) { return players_map[p]; });

    var names = svg.selectAll("text")
        .data(players)
        .enter()
        .append("text")
        .attr("x", 0)
        .attr("y", function(d) { return height * d.rank / (num_players + 1) - 20; })
        .attr("font-family", "sans-serif")
        .attr("font-size", "16px")
        .text(function(d) { return d.name + ": " + d.score; })
        ;

    var circles = svg.selectAll("circle")
        .data(rows)
        .enter()
        .append("circle")
        .attr("cx", 0)
        .attr("cy", function(d) { return height * d.rank / (num_players + 1); })
        .attr("r", function(d) { return width / cum_diameter * d.radius; })
        .attr("stroke", "rgb(208, 208, 208)")
        .attr("stroke-width", "1")
        .attr("fill", "rgb(255, 255, 255)")
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
        .transition()
        .delay(250)
        .duration(function(d) { return 1000 + d.rank / num_players * 1000; })
        .attr("cx", function(d) { return width / cum_diameter * (d.cum_diameter - d.radius); })
        .transition()
        .delay(function(d) { return 2250 + Math.random() * 2000; })
        .duration(0)
        .attr("stroke-width", function(d) {
            if (d.result === null) return "1";
            return "0";
        })
        .attr("fill", function(d) {
            if (d.result === true) return "rgb(0, 128, 0)";
            if (d.result === false) return "rgb(144, 144, 144)";
            return "rgb(255, 255, 255)";
        })
        ;
});
