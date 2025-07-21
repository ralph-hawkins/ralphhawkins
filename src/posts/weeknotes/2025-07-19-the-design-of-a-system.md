---
title: The design of a system
date: 2025-07-19
tags: weeknotes
layout: post
---

The highlight this week was spending time with the Intelligent Navigation team and sharing what we’re each working on. We’ve spoken to them before, and identified that we’re closely aligned, but this week we got into the weeds a bit more. Intelligent Navigation is one of the NHS app teams. They’re helping route people through the complexity of primary care (GPs, pharmacies, dentists), urgent care (walk‑in centres, NHS 111) and emergency care (A&E).

Their principles are essentially the same as ours. How do you use what you know about a person to make navigating the complexity of the NHS more efficient and direct people to where they need to be?

Their approach is to look at ways that we can incorporate a patient’s clinical history into their navigation journey - one example of how they could do this is by using Adjusted Clinical Groups (ACGs). ACGs are a way of scoring how complex someone’s health is overall and using this to make more informed decisions about how to help someone. If you’re generally healthy and have a fever, you get simple advice like ’rest and take paracetamol.’ But if you have diabetes, heart problems, and depression, that same fever gets treated much more seriously – you might need to see a doctor immediately. If the NHS knows who you are and how healthy you are, it can make more informed decisions about how to help you. This is a new application of ACGs – using them for real‑time triage rather than population planning. It may mean this model has limitations. But I think the principle is good, and using an existing model is clearly an efficient approach.

There are some differences between prevention and unplanned care. In prevention we want to give people choice in what support they get. We’ve seen many people would prefer to get mental health support before trying something like stopping smoking or becoming more active. There’s also research to show that behaviour change needs to start with trust. I don’t think that would be entirely absent from getting immediate treatment, but perhaps other needs take higher priority.

We discussed the value of showing something like the ACG score to users. This is similar to showing someone their health risks. To me this comes down to means. Can someone do something to address their score or not? Are we helping them to address their risk, or just telling them about it? If we cannot help someone or they’re unable to address it, then don’t show their risk. If we can support someone, then maybe there’s value. That’s more complex in reality, but it’s a design principle I believe in.

Across the two areas, the overall pattern is the same. Use what data you have about the person and the available next step to triage them. There are clear ways our services could benefit each other. Using ACGs will help us make sure we recommend something safe for a user. For example, we wouldn’t recommend anyone with an eating disorder start trying to lose weight using an unsupervised programme. The data we use to help understand a user’s health risk will also feed into the ACG to improve its accuracy.

I think our work needs to unify. If you look at them with enough abstraction, these are very similar journeys. We’re still early in the work we’re doing in prevention and have a lot to learn. We’ve deliberately moved away from an abstracted platform approach to more specific condition‑led services. But eventually we want to get to the place where we can deal with a person’s health needs in a way that doesn’t silo them by a specific condition, but meets all their needs.

Going beyond prevention, users shouldn’t need to be aware of the difference between ’prevention’ and ’treatment’ services. They just need to feel better. Ideally user journeys within the NHS would seamlessly hand‑off between people who are in a prevention part of the journey and people who need immediate care. There is already work in our teams to recognise when someone is at immediate risk, but right now, that hand‑off is pretty basic.

There are opportunities to improve alignment. I think adopting the same ACG model gives us a shortcut to interoperability and will help add value sooner. In the longer term I think we need a shared framework to help users determine their best next action, whether that’s visiting A&E or quitting smoking.

Removing these silos is ultimately where we need to get to. That’s hard in the NHS – different funding, different governance, different metrics. Which makes me wonder whether user centred design in the NHS requires a fundamentally different model that would support alignment more organically. With better data sharing, you would want to create incentives around outcomes for people regardless of how they interact with the NHS.
