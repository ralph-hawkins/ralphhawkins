---
title: Limbic Öpik
date: 2025-10-11
tags: weeknotes
layout: post
---

### Personalisation eats data

I’ve been continuing to build a prototype to test how personalised prevention could work – assessing someone’s health risks and connecting them to the right services.

To reduce the amount of hard‑coding necessary I spent time refactoring it. Each prevention service now fits into one of 3 types:

- apps (for example, Active 10 or Couch to 5k)
- appointments (for example, booking lung cancer screening or a cholesterol test at a pharmacy, or running club)
- online services (for example, finding a diabetes coach, or speaking to an online therapist)

Each service type follows the same pattern, only the content changes, which is set in a config file.

I’ve also built a more sophisticated approach for recommending services. Initially, I hard‑coded priority. If the persona had a risk that matched the service, then the user would be recommended that service. This didn’t factor in that some services are better at addressing multiple risk factors. For example, stopping smoking impacts:

- lung cancer
- cardiovascular disease
- type 2 diabetes
- hypertension

I added the risk factors the service addresses to each service. Doing this made exercise apps the most important recommendation for my default persona because, in my model at least, getting exercise addresses many areas of a person’s health. The running app Couch to 5k, for example, impacts:

- cardiovascular disease
- type 2 diabetes
- hypertension
- obesity related illness
- mental health

However recommending that someone who is eligible for lung cancer screening downloads an exercise app doesn’t seem right. I needed a different approach. Instead of just listing which risks a service addresses, I added impact strength ratings. Now Couch to 5K looks like this:

- lung cancer: none
- cardiovascular disease: low
- alcohol related illness: none
- type 2 diabetes: low
- hypertension: low
- obesity related illness: low
- mental health: low

This means the prioritisation is more appropriate. All of this is a long way of saying – the more accurately you want to recommend services, the more detailed data you need about those services. Personalisation will be limited by and a product of curation and maintenance.
This is a policy and incentive problem. Who benefits enough from accurate recommendations to invest in ongoing curation? Local services are closer to the detail, but would need to see clear benefit from maintaining this level of data. I spend a lot of time thinking about whether it’s possible to create a system that will be correctly incentivised to do this. This genuinely might be a use case for AI.

For the demo at least, separating clinical referral from behavioural recommendations will help. This will allow us to present both as next steps but create a distinction that allows the stricter eligibility criteria of screening and vaccination to take precedence over behaviour change recommendations. I need to add eligibility to the model.

I think that also means I can model behaviour change services better, adding something that allows for more nuanced judgments between similar services like Active 10 and Couch to 5K. This will be necessary when I add user preference. I knew when I started this that I’d be building something more complex than necessary to simply demo our vision, but as I wrote about last week, it allows me to play with the problems a real service will face.

### Scope and silos

I have this nagging issue in my mind when I’m working on the demo – it’s focused on health issues that can be addressed through behaviour change because that’s the core of our work, but I’ve also included a bit of screening and a bit of monitoring. All of this is a bit arbitrary, but somewhat reflects the work going on within our teams and some things that are immediately adjacent.
Health is a messy area and we’ve tried to limit the scope of our work to make what we’re doing manageable. But scope and silos are essentially the same thing to a user.
It’s hard not to be led by conditions and organisational scope even when our stated goal is to cut across them.

### AI health coach

We’re working on an AI health coach to help people build healthier habits. It’s a tricky project because of how novel the work is and how clinical governance is built on predictability and accountability.

The team had their first sprint playback for alpha – which means they are now building things, which is great. Now we start having the interesting conversations. The team have started by scraping NHS.UK (yes, scraping because, of course). So now we have a model that contains all the information the NHS has published as of the last scrape. A topic of conversation that came up was what happens when the AI doesn’t understand what a user is saying. The most clinically safe thing to do is refer the user to 111. But I think the reality of that would make it unusable. If every time the AI didn’t understand a user it shut down, it’s going to be a terrible experience. So we need areas that allow the AI to ask for more clarity, but also areas where if the AI doesn’t understand it directs the user to seek help from a human. Those areas of allowable misunderstanding need to be carefully defined and predictable. Reducing this kind of ambiguity will take the kind of work I don’t have a good grasp on. Interesting.

---

Not sure if this is a brag or not – but the continuing highlight of my job is working with the incredible UCD team in Personalised Prevention Services. They’re all great humans who are incredible at their jobs. I’m so happy to be part of this team and to get to play a role in supporting them.
