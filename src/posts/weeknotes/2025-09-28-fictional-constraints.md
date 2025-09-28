---
title: Fictional constraints
date: 2025-09-28
tags: weeknotes
layout: post
---

I’m continuing to prototype how our service might look when we move from condition‑led journeys to something more joined‑up.

It’s a funny thing to design because I’m working with fictional constraints. I’m trying to make those constraints as real as possible, but that’s making my life harder.

To prevent myself from making everything too perfect for one use case, I’ve started with 2 personas. The personas are (JSON files with) lists of characteristics, like their age, how much they smoke and how active they are. My goal is to randomly generate a persona and have the prototype journey work for them. This way I’m forcing myself to design journeys that are driven by data and can cope with a broad range of scenarios.

This means I’m spending as much time thinking about the data as the interface. After about 3 iterations, the data has gotten fairly nuanced. There’s a list of risks (smoking, drinking, or lack of physical activity). Risks are prioritised (smoking is worse than drinking). Each persona’s risk has a level of severity (high, medium, and low). Risks have interventions (smoking has 2 interventions – lung cancer check and quitting smoking). Each intervention has services (quitting smoking has apps like the NHS quit smoking app and a fictional national digital smoking cessation service). This way I can make recommendations based on a persona’s information.

I also built a very basic risk calculator. It will probably need refining though because my heavy drinking, heavy smoking 45‑year‑old currently has a health age of 84.

I’m trying to balance making this workable and not too complicated. But it’s a process of figuring out as I go along. I’m resisting the urge to start afresh with everything I’ve learnt over the last couple of weeks.

I think this approach is useful. It’s forcing me to make realistic compromises and think through how this would work.

The real constraints aren’t in the last mile of interface design. They’re things like – if you refer a user to a lung cancer check, knowing which provider runs that service, being able to handle each individual provider’s processes and having the contracts in place to do any of that.

---

Our team working on a [health coach posted their first design history](https://design-history.prevention-services.nhs.uk/ai-health-coach/2025/09/) this week.
