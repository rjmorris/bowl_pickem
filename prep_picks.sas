/* Filename: prep_picks.sas
 * Authors:  Joey Morris [RJM]
 * Purpose:  Use the picks dataset sent to me by Derick to create a file for
 *           use as input to the visualizations.
 *
 * Input:
 *           -- SAS Datasets --
 *           bowl.picks
 *
 * Output:
 *           -- TSV Files --
 *           &bowl_dir\picks.tsv
 *
 * Software:
 *           SAS 9.3
 *
 * Modifications:
 *   26-Dec-2014, RJM
 *     - Initial version.
 */

%let bowl_dir = C:\Users\rjmorris\My Documents\store\Bowl Pickem\visualization;
libname bowl "&bowl_dir";

options mergenoby=warn mprint mprintnest msglevel=i;
options linesize=max nocenter;


data picks_raw;
    set bowl.picks;
    run;


/*
data _null_;
    set picks_raw;
    *where game eq "Foster Farms" and name eq "Derick";
    where game eq "Miami Beach" and name eq "Derick";

    put name;

    do i = 1 to length(selection);
        letter = substr(selection, i, 1);
        ascii = rank(letter);
        put letter ascii;
    end;

    run;
*/


data picks;
    set picks_raw;

    /* Clean up some of the bowl names.
     */

    if game eq "Championship Game" then game = "Championship";
    else if game eq "Rose (Semifinal)" then game = "Rose";
    else if game eq "Sugar (Semifinal)" then game = "Sugar";
    else if game eq "Russell Athletic Bowl" then game = "Russell Athletic";


    /* The matchup variable includes non-breaking spaces. Replace them with
     * regular spaces. Because the selections were copied from the matchup
     * column, sometimes they have a trailing non-breaking space. Remove those.
     */

    matchup = translate(matchup, " ", byte(160));

    if substr(selection, length(selection), 1) eq byte(160)
        then selection = substr(selection, 1, length(selection)-1);


    /* Format the "Miami (Fla.)" pick consistently.
     */

         if selection eq "MIAMI"        then selection = "MIAMI(FLA.)";
    else if selection eq "MIAMI (FLA.)" then selection = "MIAMI(FLA.)";


    /* Parse the participating team names from the matchup variable.
     */

    length
        team1-team4 $50
        pick $50
        ;

    if matchup eq "Semifinal winners" then do;
        team1 = "Alabama";
        team2 = "Oregon";
        team3 = "Florida State";
        team4 = "Ohio State";
    end;
    else do;
        re = prxparse("/(No\. \d )?([\w ().&]+) \(\d+-\d+\) vs\. (No\. \d )?([\w ().&]+) \(\d+-\d+\)/");
        if prxmatch(re, matchup) then do;
            team1 = prxposn(re, 2, matchup);
            team2 = prxposn(re, 4, matchup);
        end;
        else put "***WARNING: Failed to parse matchup: " matchup;
    end;


    /* The selection variable is the result of a compress(upcase). Re-assign it
     * to a more natural form.
     */

    array team[4];
    do i = 1 to dim(team);
        if compress(upcase(team[i])) eq selection then do;
            pick = team[i];
            leave;
        end;
    end;


    /* Make sure the pick matches one of the participating teams.
     */

    if missing(pick) then put "***WARNING: Unexpected selection: " name= matchup= selection=;


    /* Create a SAS date variable for the game date.
     */

    re = prxparse("/(Dec|Jan)\. (\d+)/");

    length month $3;

    if prxmatch(re, date) then do;
        month = prxposn(re, 1, date);
        day = input(prxposn(re, 2, date), 2.);

        if month eq "Dec" then game_date = mdy(12, day, 2014);
        else if month eq "Jan" then game_date = mdy(1, day, 2015);
        else put "***WARNING: Unhandled month: " date= month=;
    end;
    else put "***WARNING: Failed to parse date: " date;


    /* Create a SAS datetime variable for the game date/time.
     */

    if time eq "Noon" then time = "12:00 p.m.";

    re = prxparse("/(\d+):?(\d+)? ([ap])\.m\./");

    length ampm $1;

    if prxmatch(re, time) then do;
        hour = input(prxposn(re, 1, time), 2.);
        minute = input(prxposn(re, 2, time), 2.);
        ampm = prxposn(re, 3, time);

        if minute eq . then minute = 0;
        if ampm eq "p" and hour ne 12 then hour = hour + 12;

        game_time = dhms(game_date, hour, minute, 0);
    end;
    else put "***WARNING: Failed to parse time: " time;

    format game_time mdyampm.;


    keep
        name
        game
        location
        game_time
        matchup
        team1-team4
        pick
        confidence_score
        ;

    run;


data picks;
    set picks;

    length winner $50;

         if matchup eq 'UL Lafayette (8-4) vs. Nevada (7-5)' then winner = 'UL Lafayette';
    else if matchup eq 'Utah State (9-4) vs. UTEP (7-5)' then winner = 'Utah State';
    else if matchup eq 'Colorado State (10-2) vs. Utah (8-4)' then winner = 'Utah';
    else if matchup eq 'Air Force (9-3) vs. Western Michigan (8-4)' then winner = 'Air Force';
    else if matchup eq 'Bowling Green (7-6) vs. South Alabama (6-6)' then winner = 'Bowling Green';
    else if matchup eq 'Memphis (9-3) vs. BYU (8-4)' then winner = 'Memphis';
    else if matchup eq 'Marshall (12-1) vs. Northern Illinois (11-2)' then winner = 'Marshall';
    else if matchup eq 'San Diego State (7-5) vs. Navy (6-5)' then winner = 'Navy';
    else if matchup eq 'Western Kentucky (7-5) vs. Central Michigan (7-5)' then winner = 'Western Kentucky';
    else if matchup eq 'Fresno State (6-7) vs. Rice (7-5)' then winner = 'Rice';
    else if matchup eq 'Illinois (6-6) vs. Louisiana Tech (8-5)' then winner = 'Louisiana Tech';
    else if matchup eq 'Rutgers (7-5) vs. North Carolina (6-6)' then winner = 'Rutgers';
    else if matchup eq 'NC State (7-5) vs. UCF (9-3)' then winner = 'NC State';
    else if matchup eq 'Virginia Tech (6-6) vs. Cincinnati (9-3)' then winner = 'Virginia Tech';
    else if matchup eq 'Duke (9-3) vs. Arizona State (9-3)' then winner = 'Arizona State';
    else if matchup eq 'Miami (Fla.) (6-6) vs. South Carolina (6-6)' then winner = 'South Carolina';
    else if matchup eq 'Boston College (7-5) vs. Penn State (6-6)' then winner = 'Penn State';
    else if matchup eq 'Nebraska (9-3) vs. USC (8-4)' then winner = 'USC';
    else if matchup eq 'West Virginia (7-5) vs. Texas A&M (7-5)' then winner = 'Texas A&M';
    else if matchup eq 'Clemson (9-3) vs. Oklahoma (8-4)' then winner = 'Clemson';
    else if matchup eq 'Texas (6-6) vs. Arkansas (6-6)' then winner = 'Arkansas';
    else if matchup eq 'Notre Dame (7-5) vs. LSU (8-4)' then winner = 'Notre Dame';
    else if matchup eq 'Louisville (9-3) vs. Georgia (9-3)' then winner = 'Georgia';
    else if matchup eq 'Maryland (7-5) vs. Stanford (7-5)' then winner = 'Stanford';
    else if matchup eq 'TCU (11-1) vs. Ole Miss (9-3)' then winner = 'TCU';
    else if matchup eq 'Arizona (10-3) vs. Boise State (11-2)' then winner = 'Boise State';
    else if matchup eq 'Georgia Tech (10-3) vs. Mississippi State (10-2)' then winner = 'Georgia Tech';
    else if matchup eq 'Wisconsin (10-3) vs. Auburn (8-4)' then winner = ' ';
    else if matchup eq 'Minnesota (8-4) vs. Missouri (10-3)' then winner = ' ';
    else if matchup eq 'Baylor (11-1) vs. Michigan State (10-2)' then winner = ' ';
    else if matchup eq 'No. 2 Oregon (12-1) vs. No. 3 Florida State (13-0)' then winner = ' ';
    else if matchup eq 'No. 1 Alabama (12-1) vs. No. 4 Ohio State (12-1)' then winner = ' ';
    else if matchup eq 'Houston (7-5) vs. Pittsburgh (6-6)' then winner = ' ';
    else if matchup eq 'Iowa (7-5) vs. Tennessee (6-6)' then winner = ' ';
    else if matchup eq 'Kansas State (9-3) vs. UCLA (9-3)' then winner = ' ';
    else if matchup eq 'Oklahoma State (6-6) vs. Washington (8-5)' then winner = ' ';
    else if matchup eq 'Florida (6-5) vs. East Carolina (8-4)' then winner = ' ';
    else if matchup eq 'Toledo (8-4) vs. Arkansas State (7-5)' then winner = ' ';
    else if matchup eq 'Semifinal winners' then winner = ' ';
    else put "***ERROR: Unexpected matchup: " matchup;

    if winner eq " " then correct = .;
    else if winner eq pick then correct = 1;
    else correct = 0;

    if correct eq 1 then score = confidence_score;
    else score = 0;

    run;


/*****
 * Compute the scores and assign a standings rank.
 */

proc means data=picks noprint;
    class name;
    types name;
    output out=scores(keep = name total_score games_correct)
           sum(score) = total_score
           sum(correct) = games_correct;
    run;

proc sort data=scores;
    by descending total_score descending games_correct name;
    run;

data scores;
    set scores;
    rank = _n_;
    run;


proc sort data=picks;
    by name;
    run;

proc sort data=scores;
    by name;
    run;

data picks;
    merge picks
          scores(keep = name rank);
    by name;
    run;
    

/*****
 * Output to a TSV file, sorted by rank.
 */

proc sort data=picks;
    by rank game_time;
    run;


proc export data=picks outfile="&bowl_dir\picks.tsv" dbms=tab replace;
    run;
