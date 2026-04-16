I'd like to build a website that uses a JSON endpoint where the endpoint has the information about different sessions at an upcoming conference. The sessions are grouped by type and have a name, a speaker, and a description. I'd like the user of the website to be able to schedule and plan for their team. Their team should allow them to mark which ones look interesting and which ones they plan to go to.

HTML/JS/CSS ONLY

I'm thinking this could be a stateless sort of session. I'd like it to be hosted as a GitHub page, so all of the work should be done on the client side as far as fetching the data and rendering the data. It should save the person's preferences and their team's preferences. For a future plan, I'd like to be able to save that data somewhere. We'll do a little bit of hand-waving around that right now.

The point of this will be for a team who's planning to attend this conference. Any person might be interested in different events, or the main user, I think, would be the team manager, the manager, to highlight what sessions look interesting and then try to plan which member of the team should be attending the different sessions. It'd be nice for there to be notes or comments about the sessions. I'd have that be a tool that they're able to use. 

The JSON is at 
https://slate-partners.technolutions.net/manage/query/run?id=8b7142c2-6c70-4109-9eeb-74d2494ba7c8&cmd=service&output=json&h=b0203357-4804-4c5d-8213-9e376263af44


Additional features that I would like would be to be able to filter down by day and by time. It would also be nice to filter by session type within the main thing. I would also like to load the session information when the page first loads and hide the tile which is asking to refresh the session information. Maybe set that in a settings hidden settings tab. Same with, once you save your team members, once you save your team names, like to save that and then hide that; put that in the settings hidden settings panel. 


The provider of the export feed is working on adding a date and time, but for now can the script check if there is a date export? If not, then we need to calculate the actual day. This particular conference starts June 25th, 2026, so that would be Wednesday; Thursday would be the 26th, and Friday the 27th. That's the mapping of the dates for this particular conference. Ideally, in years following, it will have a date and time, but this is what we have for now.

It'd be nice when you save the team in the tiles of the particular sessions, if those actually just show the team names and then within them have check boxes for that team member. If I have Lloyd, Kathryn, and Tom, then within each session we have Lloyd and a check box for going or a check box for interested.

The final element that I'd like to have is a schedule. Ideally, that would look like a calendar schedule, three days, with the time slots. We will assume they're an hour for the particular sessions, with the name of the session and the name of the person who's going to the sessions. If you hover over them, I'd like to then show the detail of the session as a tooltip on the final schedule of those sessions.

Additionally, we'd like to have the ability to filter a list of sessions by the list of only those that are checked as interested or going for any team member, or then for the individual team members. If I have my team set in my settings, then I can view, when I save the settings, the settings collapse, but then I can see Kathryn and I can click on the schedule to see the sessions that Kathryn is interested in. 