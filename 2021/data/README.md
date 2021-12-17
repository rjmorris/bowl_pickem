Create a `picks.tsv` file containing nothing but a header row. The column names should be `player`, `bowl`, `selection`, and `confidence`.

Store the original entry form sent by Derick. This is `BowlsYYYY.xlsx`.

Open `BowlsYYYY.xlsx` in LibreOffice Calc and export it to `games.tsv`.

Open `games.tsv` in LibreOffice Calc and make a number of edits. In some cases, the order of these edits is important.

1. Add a column named `order_orig`. Fill this column with a counter going from 1 to n. This column might be useful later for sorting the spreadsheet to match the one sent by Derick.
1. Delete the `Selection`, `Confidence score`, `Selection point spreads`, `Sum of selection point spreads`, and `0` columns.
1. Rename all the columns to use lowercase. For example, rename `Time` to `time`.
1. Rename the `bowl`, `favorite`, and `underdog` column to have an `_orig` suffix, such as `bowl_orig`. These will be needed later for merging with the picks spreadsheet sent by Derick.
1. Rename the `location` column to `location_orig`. I'll be editing the locations later, so saving the original value is just for reference in case I want to see the differences.
1. Rename the `point spread` column to `spread`.
1. Copy the `bowl_orig` column to a new column named `bowl`. Edit the names to your liking. These are the bowl names that will be displayed in the visualization. Some conventions:
    - Don't include the word "Bowl" in the name, so it's "Peach", not "Peach Bowl".
    - Remove branding unless the name is nothing but a brand. For example, it's "Gator", not "TaxSlayer Gator". But "LendingTree" has to stay "LendingTree".
    - The semifinal games have a "(Semis)" suffix, such as "Orange (Semis)".
    - The championship game is called "Championship".
1. Add new columns named `year`, `month`, `day`, `hour`, and `minute`. Make them text columns. Fill these in based on the contents of the `date` and `time` columns. Use two digits for `month`, `day`, `hour`, and `minute`, padding with a leading 0 if necessary. Use a 24-hour clock for `hour`.
1. Add a new column named `datetime`. Fill it with a formula that concatenates the `year`, `month`, `day`, `hour`, and `minute` columns. Then copy the column and paste the values into the column.
1. Sort the spreadsheet by `datetime`. Add a new column named `date_order`. Fill this column with a counter going from 1 to n.
1. Copy the `location_orig` column to a new column named `location`. Edit the locations to your liking. These values will be displayed in the visualization. Some conventions:
  - For games in the U.S., the location should be written as "City Name, ST", where "ST" is the two-character state postal code. (The original values tend to either omit the state, spell it out fully, or use an abbreviation like "Tex.")
  - For games outside the U.S., the location should be written as "City Name, Country Name".
1. Sort the spreadsheet by _descending_ `spread`. Add a new column named `spread_order`. Fill this column with a counter going from 1 to n.
1. Copy the `favorite_orig` and `underdog_orig` columns to new columns named `favorite` and `underdog`. These values are displayed in the visualization where a team's name is used alone and therefore doesn't have many space restrictions. (Most of the decisions about abbreviations and acronyms listed here come from espn.com's standings page.)
   - Check for and remove trailing spaces.
   - Spell out words instead of abbreviating them. This includes directions like North (not N. Carolina), Western (not W. Michigan), and Southern (not Georgia So.); place names like Kentucky (not Western Ky.) and Appalachian (not App. State); and other qualifiers like State (not Florida St.), International (not Florida Intl.), and Atlantic (not Florida Atl.).
   - Shortened forms and nicknames are acceptable in some cases. Do use: Ole Miss, Southern Miss, Penn State, UMass, UConn, Wildcard Tech. Don't use: Pitt, Cal, Cincy.
   - Use acronyms only in the following cases: UCF, SMU, NC State, TCU, UTSA, UAB, UTEP, BYU, UNLV, UCLA, USC, Texas A&M, LSU, UL Monroe. Common acronyms that should be avoided are: UNC, USF, FAU, FIU, UVA, ECU, UGA, UVA, ODU.
   - Use Miami (FL) and Miami (OH) even if only one of the two schools appears in the list.
   - Use an apostrophe in Hawai'i.
   - Use an é in San José State
   - For the championship game, enter the semifinal bowl names. For example, the favorite might be "Peach (Semis)" and the underdog "Orange (Semis)". Which one to assign the favorite doesn't matter. (These values aren't displayed in the visualization anymore, so maybe they can even be blank.)
1. Add new columns named `favorite_abbrev` and `underdog_abbrev`. These values are displayed in the All Games list component of the visualization, where both team names appear side-by-side and space can get tight. Leave these columns blank to start with. After loading the visualization the first time, inspect the All Games list and identify any games where the names are too long. In those cases, insert a shortened form of one or both team names in these columns. Use the following rules, listed in preferred order:
    - Abbreviate State to St.
    - Abbeviate directions like Western and Northern.
    - Abbreviate place names like Kentucky and Appalachian.
    - Use acronyms like FAU or ECU.
1. Add new columns named `favorite_tiny` and `underdog_tiny`. The values are displayed for the championship game in the All Games list component of the visualization, where all four potential team names appear side-by-side and space is very tight. Leave these columns blank to start with. After setting up the `favorite_abbrev` and `underdog_abbrev` columns, load the visualization again, inspect the championship game in the All Games list, and see if the names are too long. If so, enter even shorter forms for the four playoff semifinal teams in these columns. If you have to shorten one, try to shorten all of them, unless they're already really short like LSU. They may end up looking pretty ugly, like "Clem" for Clemson or "Mich" for Michigan.
1. Add new columns named `winner`, `winner_score`, and `loser_score`.
1. Arrange the columns so that `bowl`, `date`, `time`, `favorite`, `underdog`, `winner`, `winner_score`, and `loser_score` appear together and in that order. That will make for easier data entry later when recording results.

Store the list of participant picks sent by Derick as `picks_raw.csv`.

Run `python prep_picks.py` to create `picks.tsv`. You will get errors if any of the team names in `picks_raw.csv` don't match the original team names in `games.tsv`.

Reload the visualization to make sure everything looks OK.
