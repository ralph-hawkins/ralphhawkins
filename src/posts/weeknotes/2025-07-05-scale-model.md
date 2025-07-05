---
title: Scale model
date: 2025-07-05
tags: weeknotes
layout: post
---

A challenge working on digital prevention services is the tension of providing healthcare that works for individuals on a scale that works for the country.

## Remote access to healthcare professionals

The highlight of my week was a talk by East Suffolk and North Essex NHS Foundation Trust.

Working with a tech partner, the Trust has created an online channel for people with obesity to access care. Most importantly this includes speaking to qualified healthcare professionals (doctors, psychologists, and specialist nurses) the same level of care as in-person services. The Trust has a lead clinician responsible for the online patients and the digital channel offers direct referral into pathways that are affected by obesity (for example, sleep apnea and muscoskeletal). The service has some other features like diet and exercise guidance.

But the important thing about the design of the service is integration. The users of the service are essentially remote patients, the level of care is identical to patients who attend appointments in‑person. They can move between online and in-person care seamlessly.

This has clear benefits. It saves patients the time, cost and inconvenience of travelling for an appointment. A benefit for everyone, but for people with BMI of 60 or higher, it makes a huge difference.

It also means clinicians can see more people.

For me, working from the centre, with a focus on scale, this level of integration between physical and digital feels distant. Even a one‑time handoff from our services to local services is difficult. Truly integrated digital and in‑person care is years away. But I am convinced this is what we need to strive for.

## Asking people population level questions

One of our services is looking at digitising the lung cancer screening eligibility assessment - something that currently happens over the phone for most people.

The triage consists of a few questions that calculate the user’s likelihood of having lung cancer. If they meet the threshold then they’re offered a CT scan.

The risk calculation is based on population level statistics. Things like ethnicity and level of social deprivation are factors used to calculate the risk in the model we’re likely to use (there are other models that simply ask if the user has ever smoked and their age).

The evidence and logic of asking population level questions is clear. But the implementation is another thing. For example, the offline service’s way of calculating a user’s level of deprivation is by asking them what level of education they have. It’s pretty startling to be asked this question in something asking about your health. If you’re speaking to a human on the phone, this can be handled. With a digital service the motivation for asking this question is harder to explain to users. These population risk questions appear hostile to users.

I think the exact model we use to calculate risk is still up for grabs. Ideally we can use one that safely calculates risk without feeling discriminatory. The team are also exploring if we can use different questions to get to the same calculation and ways to explain why the question is being asked, which offers some mitigation.

Long term we hope to use data about the user to avoid asking as many questions as possible.

An individual Trust can integrate with its internal systems, employ and manage clinicians, understand their specific population. At national level, we’re stuck asking everyone the intrusive questions until we have the data to personalise services.
