# Decisions

Yours to write, not your AI's. Short is good — bullets are fine, and half a page is
plenty. We read this first.

## What did the spec not tell you?

There are things this brief doesn't specify. Which ones did you hit, what did you decide,
and why?

- For calendar rules, I went with standard Monday-Friday and dates are inclusive. I also went with proportional capacity for shorter weeks.

- Since the schema was fixed, I didn't handle history so editing a person's capacity will change it across all dates (past included).

- For Tanstack Query caching, I went with save to the server and invalidate all capacity ranges (cause invalidating only the visible range would leave cached views incorrect), then a refetch. Optimistic update would introduce rollbacks and more failure cases. Of course here the tradeoff is waiting for the refresh but it's fast enough.

- I got inspired from Toggl and added Week, Month, Quarter and Custom presets for range, that wasn't specified. I fixed a 92 days limit since it covers a full quarter to avoid querying huge ranges.


## What did you notice that looked wrong?

Anything in the output that didn't match what you expected. Whether you fixed it or left
it, we want to know you saw it.

- Some assignments looked duplicated based on the work done but they had with different IDs, I assumed they were correct.

- Some people had either more allocated hours than capacity or 0 capacity and allocated work, I made sure to handle these cases.

## What did the AI get wrong that you caught?

One concrete example. Every real session has one.

- I was testing the UI and I noticed that the search input was a bit slow. I thought the agent added debouncing but I checked the code and it wasn't. Turns out we were rendering all 500 people at once and filtering was unmounting them while filtering was recreating them. I went with keeping them mounted, hiding non matches and then added deferred filtering. I questioned whether to add pagination but I thought having everything displayed would make it easier to compare people and adding it would introduce more questions about whether search and totals should cover the whole team or the current page etc..

- When testing fractional hours I noticed that stuff like 20.4 x 3 / 5 would 12.2399..98 instead of 12.24. I asked the agent for a fix and we moved the calculation to Postgres numeric arithmetic.

## What would you do differently with a week?

- I would add e2e tests with playwright, mainyl for saving, revisting cached ranges and editing.

- Check how the table behaves for larger teams and maybe add row virtualization if the rendering gets slower.

- Check whether we need to support holidays, and historical capacity.

- Think a bit about concurrency since now the latest write wins.
