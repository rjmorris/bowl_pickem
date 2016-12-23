var q = queue()
    .defer(d3.tsv, 'data/picks.tsv')
    .defer(d3.tsv, 'data/games.tsv')
;

q.await(function(err, picks, games) {

    //--------------------------------------------------------------------------
    // Prep the data.

    // Extract all the team objects from the game data.

    var teams_map = {};

    games.forEach(function(game) {
        if (!(game.favorite in teams_map)) {
            var team = {};
            team.name = game.favorite;
            team.abbrev = game.favorite_abbrev;
            teams_map[game.favorite] = team;
        }
        game.favorite = teams_map[game.favorite];
        delete game.favorite_abbrev;
        delete game.favorite_orig;

        if (!(game.underdog in teams_map)) {
            var team = {};
            team.name = game.underdog;
            team.abbrev = game.underdog_abbrev;
            teams_map[game.underdog] = team;
        }
        game.underdog = teams_map[game.underdog];
        delete game.underdog_abbrev;
        delete game.underdog_orig;
    });

    // Prep the game data.

    var games_map = {};

    games.forEach(function(game) {
        games_map[game.bowl] = game;

        game.datetime = moment(game.datetime, "YYYYMMDDHHmmss");
        game.spread = +game.spread;
        game.date_order = +game.date_order;
        game.spread_order = +game.spread_order;

        game.winner = teams_map[game.winner];
        game.winner_real = game.winner;
    });

    var num_games = games.length;

    // Extract all the player objects from the pick data.

    var players_map = {};

    picks.forEach(function(pick) {
        if (!(pick.player in players_map)) {
            var player = {};
            player.name = pick.player;
            players_map[pick.player] = player;
        }
        pick.player = players_map[pick.player];
    });

    var players = d3.values(players_map);
    var num_players = players.length;

    // Prep the pick data.

    picks.forEach(function(pick) {
        pick.confidence = +pick.confidence;

        pick.game = games_map[pick.bowl];
        delete pick.bowl;

        pick.selection = teams_map[pick.selection];
    });

    compute_pick_results();
    compute_player_scores();
    compute_player_ranks();


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
                if (get_sort_game_order(d) < num_games / 2) return [0, tip_offset_x];
                return [0, -tip_offset_x];
            })
            .direction(function(d) {
                if (get_sort_game_order(d) < num_games / 2) return 'e';
                return 'w';
            })
            .html(function(d) {
                var pick_class = 'pick_future';
                if (d.result === true) pick_class = 'pick_right';
                else if (d.result === false) pick_class = 'pick_wrong';

                return d.player.name + ' [' + d.confidence + ']: <span class="' + pick_class + '">' + d.selection.name + '</span>';
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
            return 'translate(0,' + yScale(get_sort_player_order(d)) + ')';
        })
    ;

    var barGroups = rows.selectAll('.bar-group')
        .data(function(d) {
            return picks.filter(function(pick) {
                return d === pick.player;
            });
        })
        .enter()
        .append('g')
        .classed('bar-group', true)
        .attr('transform', function(d) {
            return 'translate(' + xScale(get_sort_game_order(d)) + ',0)';
        })
        .attr('opacity', 0)
    ;

    barGroups.transition()
        .delay(function(d) {
            return 1000 * (get_sort_player_order(d) - 1) / num_players + 25 * get_sort_game_order(d);
        })
        .duration(function(d) {
            return 250;
        })
        .attr('opacity', 1)
    ;

    barGroups.append('rect')
        .classed("bar", true)
        .call(assign_bar_styles)
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
            highlightBars(d.game);
        })
        .on('mouseout', function() {
            unhighlightBars();
        })
        .on('click', function(d) {
            cycle_game_result(d);
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
        .call(assign_name_text)
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

    var num_played_games = games.filter(function(d) {
        return d.winner !== undefined;
    }).length;

    if (num_played_games / num_games < 0.67) {
        games.sort(function(a, b) {
            return d3.ascending(a.date_order, b.date_order);
        });
    }
    else {
        games.sort(function(a, b) {
            return d3.descending(a.date_order, b.date_order);
        });
    }

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
                    matchup += '<span class="pick_right">' + d.favorite.abbrev + '</span>';
                    matchup += ' / ';
                    matchup += '<span class="pick_wrong">' + d.underdog.abbrev + '</span>';
                }
                else if (d.winner === d.underdog) {
                    matchup += '<span class="pick_wrong">' + d.favorite.abbrev + '</span>';
                    matchup += ' / ';
                    matchup += '<span class="pick_right">' + d.underdog.abbrev + '</span>';
                }
                else {
                    matchup += '<span class="pick_future">' + d.favorite.abbrev + '</span>';
                    matchup += ' / ';
                    matchup += '<span class="pick_future">' + d.underdog.abbrev + '</span>';
                }
            }
            return matchup;
        })
        .on('mouseover', function(game) {
            highlightBars(game);
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

    function compute_pick_results() {
        picks.forEach(function(pick) {
            if (pick.game.winner === undefined) pick.result = null;
            else if (pick.game.winner === pick.selection) pick.result = true;
            else pick.result = false;
        });
    }

    function compute_player_scores() {
        players.forEach(function(player) {
            player.score_games = 0;
            player.score_points = 0;
        });

        picks.forEach(function(pick) {
            if (pick.result === true) {
                pick.player.score_games += 1;
                pick.player.score_points += pick.confidence;
            }
        });
    }

    function rank_players(rank_var, comparison) {
        players = players.sort(comparison);
        players.forEach(function(player, index) {
            player[rank_var] = index + 1;
        });
    }

    function compute_player_ranks() {
        rank_players('rank_points', function(a, b) {
            return d3.descending(a.score_points, b.score_points) ||
                d3.descending(a.score_games, b.score_games) ||
                d3.ascending(a.name, b.name);
        });

        rank_players('rank_games', function(a, b) {
            return d3.descending(a.score_games, b.score_games) ||
                d3.descending(a.score_points, b.score_points) ||
                d3.ascending(a.name, b.name);
        });

        rank_players('rank_name', function(a, b) {
            return d3.ascending(a.name, b.name);
        });
    }

    function sort_games() {
        svg.selectAll('.bar-group')
            .transition()
            .delay(function(d) {
                return 1000 * (get_sort_player_order(d) - 1) / num_players;
            })
            .duration(function(d) {
                return 1000;
            })
            .attr('transform', function(d) {
                return 'translate(' + xScale(get_sort_game_order(d)) + ',0)';
            })
        ;
    }

    function get_sort_game_order(d) {
        if (sort_game_method in d) return d[sort_game_method];
        else return d.game[sort_game_method];
    }

    function sort_players() {
        svg.selectAll('.player-row')
            .transition()
            .delay(function(d) {
                return 1000 * (get_sort_player_order(d) - 1) / num_players;
            })
            .duration(function(d) {
                return 1000;
            })
            .attr('transform', function(d) {
                return 'translate(0,' + yScale(get_sort_player_order(d)) + ')';
            })
        ;
    }

    function get_sort_player_order(d) {
        if (sort_player_method in d) return d[sort_player_method];
        else return d.player[sort_player_method];
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

    function highlightBars(game) {
        svg.selectAll('.bar')
            .filter(function(bar) {
                return bar.game === game;
            })
            .classed('highlight', true)
            .each(function(bar) {
                bar.quickTip.show.call(this, bar, this);
            })
                ;

        svg.selectAll('.bar:not(.highlight)')
            .classed('lowlight', true)
        ;

        $('#highlighted-bowl').text(game.bowl);
        $('#highlighted-favorite').text(game.favorite.name);
        $('#highlighted-underdog').text(game.underdog.name);
        $('#highlighted-spread').text('(' + (game.spread === 0 ? 'even' : game.spread) + ')');
        $('#highlighted-datetime').text(game.datetime.format('MMM D, h:mm a'));
        $('#highlighted-location').text(game.location);

        if (game.winner === undefined) {
            $('#highlighted-result').text('unplayed');
        }
        else {
            $('#highlighted-result').html(
                '<span class="pick_right">' +
                    game.winner.name +
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

    function cycle_game_result(pick) {
        var game = pick.game;
        var winner = undefined;

        if (pick.result === null) {
            winner = pick.selection;
        }
        else if (pick.result === true) {
            winner = (pick.selection === game.favorite ? game.underdog : game.favorite);
        }
        else {
            winner = undefined;
        }

        what_if(game, winner);
    }

    function what_if(game, winner) {
        game.winner = winner;

        compute_pick_results();
        compute_player_scores();
        compute_player_ranks();

        svg.selectAll(".bar").call(assign_bar_styles);
        svg.selectAll(".name").call(assign_name_text);

        sort_players();
    }

    function assign_bar_styles(selection) {
        selection
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
                return d.selection === d.game.favorite || d.game.spread === 0;
            })
            .classed("underdog", function(d) {
                return d.selection === d.game.underdog;
            })
            .style("mask", function(d) {
                if (d.game.winner != d.game.winner_real) {
                    return 'url(#mask-what-if)';
                }
                return undefined;
            })
        ;
    }

    function assign_name_text(selection) {
        selection
            .text(function(d) {
                return d.name + ": " + d.score_games + ' / ' + d.score_points;
            })
        ;
    }
});
