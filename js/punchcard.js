var width = window.innerWidth - 20;
var height = window.innerHeight - 20;

var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

var tip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
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
    num_games = rows.reduce(function(running, row) { return Math.max(running, +row.Confidence_Score); }, 0);
    num_players = rows.reduce(function(running, row) { return Math.max(running, +row.rank); }, 0);

    var circle_data = [];
    var cum_diameter = 0;
    for (area in d3.range(num_games + 1)) {
        circle_data[area] = {};
        d = circle_data[area];
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
        p = players_map[row.name];
        p.name = row.name;
        p.rank = +row.rank;
        p.score += +row.score;
    });

    players = Object.keys(players_map).map(function(p) { return players_map[p]; });

    var names = svg.selectAll("text")
        .data(players)
        .enter()
        .append("text")
        .attr("x", "1%")
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
        .delay(500)
        .duration(2000)
        .attr("cx", function(d) { return width / cum_diameter * (d.cum_diameter - d.radius); })
        .transition()
        .duration(function(d) { return d.Confidence_Score / num_games * 3000; })
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
/*
svg.selectAll("circle")
    .data(cx)
    .enter()
    .append("circle")
    .attr("cx", "50%")
    .attr("cy", "50%")
    .attr("r", "0.5%")
    .attr("fill", "rgb(0, 0, 192)")
    .attr("opacity", 1)
    .transition()
    .delay(function(d) { return 5000 * Math.random(); })
    .duration(2000)
    .attr("cx", function(d) { return d + "%"; })
    .attr("cy", "1%")
    .attr("r", "1%")
    .each("end", function() {
        d3.select(this)
            .transition()
            .delay(function() { return 5000 + 4000 * Math.random(); })
            .duration(2000)
            .ease("bounce")
            .attr("cy", "99%")
            .each("end", function() {
                d3.select(this)
                    .transition()
                    .duration(1500)
                    .attr("opacity", 0)
                    .remove()
            });
    });
*/

