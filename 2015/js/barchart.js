var q = queue()
    .defer(d3.tsv, 'data/picks.tsv')
    .defer(d3.tsv, 'data/games.tsv')
;

q.await(function(err, picks, games) {

    //--------------------------------------------------------------------------
    // Prep the data.

    var players_map = {};
    var games_map = {};
    var teams_map = {};

    games.forEach(function(game) {
        games_map[game.bowl] = game;

        game.datetime = moment(game.datetime, "YYYYMMDDHHmmss");
        game.spread = +game.spread;
        game.date_order = +game.date_order;
        game.spread_order = +game.spread_order;

        var team = {};
        team.team = game.favorite;
        team.abbrev = game.favorite_abbrev;
        teams_map[game.favorite] = team;

        team = {};
        team.team = game.underdog;
        team.abbrev = game.underdog_abbrev;
        teams_map[game.underdog] = team;
    });

    picks.forEach(function(pick) {
        pick.confidence = +pick.confidence;

        // Create pick variables using the games metadata.

        var game = games_map[pick.bowl];

        pick.date_order = game.date_order;
        pick.spread_order = game.spread_order;

        pick.selection_abbrev = teams_map[pick.selection].abbrev;

        if (game.winner === '') pick.result = null;
        else if (game.winner === pick.selection) pick.result = true;
        else pick.result = false;

        // Store player-specific data.

        if (!(pick.player in players_map)) {
            players_map[pick.player] = {};
            players_map[pick.player].score_games = 0;
            players_map[pick.player].score_points = 0;
        }

        var player = players_map[pick.player];

        player.player = pick.player;

        if (pick.result === true) {
            player.score_games += 1;
            player.score_points += pick.confidence;
        }
    });

    var players = d3.values(players_map);
    var num_players = players.length;

    var num_games = games.length;

    function rank_players(rank_var, comparison) {
        players = players.sort(comparison);
        players.forEach(function(player, index) {
            player[rank_var] = index + 1;
        });
    }

    rank_players('rank_points', function(a, b) {
        return d3.descending(a.score_points, b.score_points) ||
            d3.descending(a.score_games, b.score_games) ||
            d3.ascending(a.player, b.player);
    });

    rank_players('rank_games', function(a, b) {
        return d3.descending(a.score_games, b.score_games) ||
            d3.descending(a.score_points, b.score_points) ||
            d3.ascending(a.player, b.player);
    });

    rank_players('rank_name', function(a, b) {
        return d3.ascending(a.player, b.player);
    });

    picks.forEach(function(pick) {
        pick.rank_points = players_map[pick.player].rank_points;
        pick.rank_games = players_map[pick.player].rank_games;
        pick.rank_name = players_map[pick.player].rank_name;
    });


    //--------------------------------------------------------------------------
    // Define UI options.

    var tip_offset_x = 8;
    var name_offset_y = -10;
    var legend_label_offset = 10;
    var legend_symbol_pad = 4;

    var sort_game_method = "confidence";
    if (localStorage.getItem('sort_game_method') !== null) {
        sort_game_method = localStorage.getItem('sort_game_method');
    }
    update_sort_game_method_selector();

    var sort_player_method = "rank_points";
    if (localStorage.getItem('sort_player_method') !== null) {
        sort_player_method = localStorage.getItem('sort_player_method');
    }
    update_sort_player_method_selector();


    //--------------------------------------------------------------------------
    // Create the SVG using the margin convention for sizing/positioning. We
    // want the SVG to occupy all the space on screen below the header.

    // Set the sizes of some layout elements programmatically. These are too
    // complicated to get right in CSS only.
    $('#graphic-container').height($('body').height() - $('#header').outerHeight(true));

    $('#game-finder').height($('body').height() -
                             $('#contest-title').outerHeight(true) -
                             $('#game-details').outerHeight(true)
                            );

    var margin = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
    };

    var svgWidth = $('#graphic-container').width();
    var svgHeight = $('#graphic-container').height();

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

    picks.forEach(function(pick) {
        pick.quickTip = d3.tip()
            .attr('class', 'highlight-tip')
            .offset(function(d) {
                if (d[sort_game_method] < num_games / 2) return [0, tip_offset_x];
                return [0, -tip_offset_x];
            })
            .direction(function(d) {
                if (d[sort_game_method] < num_games / 2) return 'e';
                return 'w';
            })
            .html(function(d) {
                var pick_class = 'pick_future';
                if (d.result === true) pick_class = 'pick_right';
                else if (d.result === false) pick_class = 'pick_wrong';

                return d.player + ' [' + d.confidence + ']: <span class="' + pick_class + '">' + d.selection_abbrev + '</span>';
            })
        ;
    });


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

    var rows = svg.selectAll('.player-row')
        .data(players)
        .enter()
        .append('g')
        .classed('player-row', true)
        .attr('transform', function(d) {
            return 'translate(0,' + yScale(d[sort_player_method]) + ')';
        })
    ;

    var barGroups = rows.selectAll('.bar-group')
        .data(function(d) {
            return picks.filter(function(pick) {
                return d.player === pick.player;
            });
        })
        .enter()
        .append('g')
        .classed('bar-group', true)
        .attr('transform', function(d) {
            return 'translate(' + xScale(d[sort_game_method]) + ',0)';
        })
        .attr('opacity', 0)
    ;

    barGroups.transition()
        .delay(function(d) {
            return 1000 * (d[sort_player_method] - 1) / num_players + 25 * d[sort_game_method];
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
        .classed("favorite", function(d) {
            return d.selection === games_map[d.bowl].favorite;
        })
        .classed("underdog", function(d) {
            return d.selection === games_map[d.bowl].underdog;
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
        .on('mouseover', function(d) {
            highlightBars(d.date_order);
        })
        .on('mouseout', function() {
            unhighlightBars();
        })
        .each(function(d) {
            d3.select(this).call(d.quickTip);
        })
    ;

    var nameGroups = rows.append("g")
        .classed("name-group", true)
        .attr('transform', function(d) {
            return 'translate(0,' + (yScale.rangeBand()/2 + name_offset_y) + ')';
        })
    ;

    var names = nameGroups.append("text")
        .classed("name", true)
        .attr("x", 0)
        .attr("y", 0)
        // dominant-baseline=hanging puts the top of the text at the y-coord.
        //.attr("dominant-baseline", "hanging")
        .text(function(d) {
            return d.player + ": " + d.score_games + ' / ' + d.score_points;
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

    legend.attr("height", 3 * legend_symbol_height);

    legend.selectAll(".bar")
        .attr("x", 0)
        .attr("y", function(d, i) { return i * legend_symbol_height + legend_symbol_pad/2; })
        .attr("width", legend_symbol_width)
        .attr("height", legend_symbol_height - legend_symbol_pad)
        .attr("rx", 4)
        .attr("ry", 4)
    ;

    legend.selectAll(".label")
        .attr("x", legend_symbol_width + legend_label_offset)
        .attr("y", function(d, i) { return (i + 1/2) * legend_symbol_height; })
        .attr("dominant-baseline", "central")
    ;


    //--------------------------------------------------------------------------
    // Add games to the game finder panel.

    d3.select('#game-list').selectAll('.game-item')
        .data(games)
        .enter()
        .append('li')
        .classed('game-item', true)
        .html(function(d) {
            var matchup = '';
            matchup += '<span class="game-date">' + d.datetime.format('MMM D') + '</span>';
            if (d.bowl === 'Championship') {
                matchup += 'Championship';
            }
            else {
                if (d.winner === d.favorite) {
                    matchup += '<span class="pick_right">' + d.favorite_abbrev + '</span>';
                    matchup += ' / ';
                    matchup += '<span class="pick_wrong">' + d.underdog_abbrev + '</span>';
                }
                else if (d.winner === d.underdog) {
                    matchup += '<span class="pick_wrong">' + d.favorite_abbrev + '</span>';
                    matchup += ' / ';
                    matchup += '<span class="pick_right">' + d.underdog_abbrev + '</span>';
                }
                else {
                    matchup += '<span class="pick_future">' + d.favorite_abbrev + '</span>';
                    matchup += ' / ';
                    matchup += '<span class="pick_future">' + d.underdog_abbrev + '</span>';
                }
            }
            return matchup;
        })
        .on('mouseover', function(game) {
            highlightBars(game.date_order);
        })
        .on('mouseout', function(game) {
            unhighlightBars();
        })
    ;


    //--------------------------------------------------------------------------
    // Define event handlers.

    $("#sort-game-confidence").click(function() {
        if (sort_game_method == "confidence") return;
        set_sort_game_method("confidence");
        update_sort_game_method_selector();
        sort_games();
    });

    $("#sort-game-date").click(function() {
        if (sort_game_method == "date_order") return;
        set_sort_game_method("date_order");
        update_sort_game_method_selector();
        sort_games();
    });

    $("#sort-game-spread").click(function() {
        if (sort_game_method == "spread_order") return;
        set_sort_game_method("spread_order");
        update_sort_game_method_selector();
        sort_games();
    });

    $("#sort-player-points").click(function() {
        if (sort_player_method == "rank_points") return;
        set_sort_player_method("rank_points");
        update_sort_player_method_selector();
        sort_players();
    });

    $("#sort-player-games").click(function() {
        if (sort_player_method == "rank_games") return;
        set_sort_player_method("rank_games");
        update_sort_player_method_selector();
        sort_players();
    });

    $("#sort-player-name").click(function() {
        if (sort_player_method == "rank_name") return;
        set_sort_player_method("rank_name");
        update_sort_player_method_selector();
        sort_players();
    });

    $("#help-show").click(function() {
        $("#help").fadeToggle();
        $("#help-show").toggleClass('active');
    });

    $("#help #close").click(function() {
        $("#help").fadeToggle();
        $("#help-show").removeClass('active');
    });


    //--------------------------------------------------------------------------
    // Function definitions.

    function sort_games() {
        svg.selectAll('.bar-group')
            .transition()
            .delay(function(d) {
                return 1000 * (d[sort_player_method] - 1) / num_players;
            })
            .duration(function(d) {
                return 1000;
            })
            .attr('transform', function(d) {
                return 'translate(' + xScale(d[sort_game_method]) + ',0)';
            })
        ;
    }

    function sort_players() {
        svg.selectAll('.player-row')
            .transition()
            .delay(function(d) {
                return 1000 * (d[sort_player_method] - 1) / num_players;
            })
            .duration(function(d) {
                return 1000;
            })
            .attr('transform', function(d) {
                return 'translate(0,' + yScale(d[sort_player_method]) + ')';
            })
        ;
    }

    function set_sort_game_method(method) {
        sort_game_method = method;
        localStorage.setItem('sort_game_method', method);
    }

    function update_sort_game_method_selector() {
        $('.sort-game-option').removeClass('active');
        if (sort_game_method === "date_order") {
            $('#sort-game-date').addClass('active');
        }
        else if (sort_game_method === "confidence") {
            $('#sort-game-confidence').addClass('active');
        }
        else {
            $('#sort-game-spread').addClass('active');
        }
    }

    function set_sort_player_method(method) {
        sort_player_method = method;
        localStorage.setItem('sort_player_method', method);
    }

    function update_sort_player_method_selector() {
        $('.sort-player-option').removeClass('active');
        if (sort_player_method === "rank_points") {
            $('#sort-player-points').addClass('active');
        }
        else if (sort_player_method === "rank_games") {
            $('#sort-player-games').addClass('active');
        }
        else {
            $('#sort-player-name').addClass('active');
        }
    }

    function highlightBars(date_order) {
        svg.selectAll('.bar')
            .filter(function(bar) {
                return bar.date_order === date_order;
            })
            .classed('highlight', true)
            .each(function(bar) {
                bar.quickTip.show.call(this, bar, this);
            })
                ;

        svg.selectAll('.bar:not(.highlight)')
            .classed('lowlight', true)
        ;

        var game = games.filter(function(d) {
            return d.date_order === date_order;
        })[0];

        $('#highlighted-bowl').text(game.bowl);
        $('#highlighted-favorite').text(game.favorite);
        $('#highlighted-underdog').text(game.underdog);
        $('#highlighted-spread').text('(' + game.spread + ')');
        $('#highlighted-datetime').text(game.datetime.format('MMM DD, h:mm a'));
        $('#highlighted-location').text(game.location);

        if (game.winner === '') {
            $('#highlighted-result').text('unplayed');
        }
        else {
            $('#highlighted-result').html(
                '<span class="pick_right">' +
                    game.winner +
                    '</span> ' +
                    game.winner_score +
                    '-' +
                    game.loser_score
            );
        }
    }

    function unhighlightBars() {
        svg.selectAll('.bar')
            .classed('highlight', false)
            .classed('lowlight', false)
            .each(function(bar) {
                bar.quickTip.hide.call(this, bar);
            })
                ;

        $('.game-value').text('');
    }
});
