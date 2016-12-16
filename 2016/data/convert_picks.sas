/* Filename: convert_picks.sas
 * Authors:  Joey Morris [RJM]
 * Purpose:  Starting with the picks dataset sent to me by Derick, create a
 *           text version for use in further processing.
 *
 * Input:
 *           -- SAS Datasets --
 *           bowl.picks [renamed from stacked2015]
 *
 * Output:
 *           -- TSV Files --
 *           &bowl_dir\picks_raw.tsv
 *
 * Software:
 *           SAS 9.4
 *
 * Modifications:
 *   20-Dec-2015, RJM
 *     - Initial version.
 */

%let bowl_dir = .;
libname bowl "&bowl_dir";


data _null_;
    set bowl.picks;

    file "&bowl_dir\picks_raw.tsv" lrecl=32000 delimiter='09'x;

    if _n_ eq 1 then do;
        put
                  "player"
            '09'x "bowl"
            '09'x "favorite"
            '09'x "underdog"
            '09'x "selection"
            '09'x "confidence"
            ;
    end;

    put
        name
        bowl
        favorite
        underdog
        selection
        confidence_score
        ;

    run;
