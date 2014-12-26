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


    /* Some people entered "Miami" as their pick, and some entered
     * "Miami (Fla.)". Make them consistent.
     */

    if selection eq "MIAMI" then selection = "MIAMI(FLA.)";


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

         if game eq "New Orleans" then winner = "UL Lafayette";
    else if game eq "New Mexico" then winner = "Utah State";
    else if game eq "Royal Purple" then winner = "Utah";
    else if game eq "Idaho Potato" then winner = "Air Force";
    else if game eq "Camellia" then winner = "Bowling Green";
    else if game eq "Miami Beach" then winner = "Memphis";
    else if game eq "Boca Raton" then winner = "Marshall";
    else if game eq "Poinsettia" then winner = "Navy";
    else if game eq "Bahamas" then winner = "Western Kentucky";
    else if game eq "Hawaii" then winner = "Rice";
    else if game eq "Heart of Dallas" then winner = " ";
    else if game eq "Quick Lane" then winner = " ";
    else if game eq "Bitcoin" then winner = " ";
    else if game eq "Military" then winner = " ";
    else if game eq "Sun" then winner = " ";
    else if game eq "Independence" then winner = " ";
    else if game eq "Pinstripe" then winner = " ";
    else if game eq "Holiday" then winner = " ";
    else if game eq "Liberty" then winner = " ";
    else if game eq "Russell Athletic" then winner = " ";
    else if game eq "Texas" then winner = " ";
    else if game eq "Music City" then winner = " ";
    else if game eq "Belk" then winner = " ";
    else if game eq "Foster Farms" then winner = " ";
    else if game eq "Peach" then winner = " ";
    else if game eq "Fiesta" then winner = " ";
    else if game eq "Orange" then winner = " ";
    else if game eq "Outback" then winner = " ";
    else if game eq "Citrus" then winner = " ";
    else if game eq "Cotton" then winner = " ";
    else if game eq "Rose" then winner = " ";
    else if game eq "Sugar" then winner = " ";
    else if game eq "Armed Forces" then winner = " ";
    else if game eq "TaxSlayer" then winner = " ";
    else if game eq "Alamo" then winner = " ";
    else if game eq "Cactus" then winner = " ";
    else if game eq "Birmingham" then winner = " ";
    else if game eq "GoDaddy" then winner = " ";
    else if game eq "Championship" then winner = " ";
    else put "***ERROR: Unexpected game: " game;

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
