# cos30045_finalproject

The web must be responsive for both laptop and mobile phones

## Pages:

Nav bar:

- Title: Australian Mobile phone Fines
- Caption: National Road Safety Data - COS30045 Final Project
- Buttons to navigate to pages on the right

1. Dashboard
   This webpage is designed to inform policymakers, researchers, the public and media about trends in illegal mobile phone use while driving in Australia.

Mobile phone use while driving is a major safety issue in Australia. Existing dashboards present basic trends but fail to fully leverage the detailed enforcement data collected since 2023, limiting deeper insights into driver behavior, demographical differences, and the impact of AI cameras on road safety.
This web page version attempted to improve the current Data Hub by allowing users to interact with data more deeply.

Call to action buttons - large card:
Explore Data -> link to Data page
Ethics and Data Policy -> Link to policy
About Us -> link to about us

2. Data
   <<place holder for charts>>
3. Policy
   Data source
   Data Problems
   Policy

4. About us
   Project Title: Mobile Phone Fines in Australia: Insights and Trends
   Our team: a team of Swinburne University of Technology students, majoring in data science. This project is part of our final project in unit COS30045 - Data Visualisation
   Team Roles:
   <<member1>>Cap Viet Anh:<<place holder for role>>
   <<member2>>Nguyen Ngoc Bao Chau:<<place holder for role>>
   <<member3>>Nguyen Nhat Lam:<<place holder for role>>

Future Developments

Footer:

- Copyright: COS30045 - Hanoi Jan 2026 - Group 3
- Data Source: https://datahub.roadsafety.gov.au/safe-systems/safe-road-use/police-enforcement
- Link to Github: https://github.com/nnhatlam/cos30045_finalproject
- AI Declaration: This webpage is developed with the help of GitHub Copilot, Google Gemini, Antigravity, and ChatGPT

## Styling

- Nav bar: background: var(--linear1, linear-gradient(180deg, #062654 0%, #7FADE0 100%));
- Body background: background: linear-gradient(180deg, #EAF0F7 49.52%, #A9BCD3 100%);
- Footer: background: #062654;
- Button styles: have mouse-hover effect
- Text: Font: Public Sans

## Tech Stack:

- HTML
- CSS
- JavaScripts (use scripts for navigation through pages and ensure that the active page is highlight in nav bar)

# Story board

## Home page: Driving Policy through Data

People assume the mobile phone driving crisis is driven by TikTok-obsessed teenagers. But the data tells a completely different, much more automated story.
To eliminate serious road injuries, we must move past assumptions and base our safety strategies on hard data. This dashboard opens the black box of mobile phone enforcement in Australia, revealing the demographic realities and infrastructure gaps driving current trends.
Call to action button (explore data, read policy, about us)
Cards showing summary of data (total fines detected, year range, when the page loads, numbers rapidly count up from zero to their final values)
Why this matters?: Mobile phone usage while driving remains a persistent safety issue on Australian roads. While existing dashboards often limit themselves to displaying overarching trends, this website is designed to uncover the deeper, granular variables driving these offences. (make this part stand out from the normal text paragraph. Maybe use a green background gradient for this block)

## Data page

Hero - title: Who Gets Caught on Their Phone While Driving?
Text: Effective road safety funding requires knowing exactly where the danger lies. While public safety campaigns often focus on young, inexperienced drivers, the National Road Safety Data Hub reveals a different reality.

// add a small caption explaining the abbreviations: NSW: New South Wales, QLD: Queensland, VIC: Victoria, ACT: Australian Capital Territory, SA: South Australia, WA: Western Australia, TA: Tasmania, NT: Northern Territory

Chapter 1: Are We Funding Campaigns for the Wrong Drivers?
Picture a distracted driver. Who comes to mind? For most of us, the stereotype is immediate: a young student, fresh out of high school, secretly scrolling through their phone at a red light. Surprisingly, the youngest drivers (under 17) account for the fewest fines, suggesting that P-plater restrictions or behaviour may differ from mid-career adults.

Chapter 2: When Does a Distraction Become a Criminal Record?
While most drivers get fines and demerit points for phone use, data shows that people aged 26–39 face much worse results, including the most fines, criminal charges, and arrests. This brings up an important question: Is this because mid-career people drive more carelessly, or are other factors, such as repeat offences, unregistered vehicles, or related traffic violations, leading to these harsh legal outcomes?

Chapter 3: Is AI Surveillance Replacing Highway Patrols?
The National Road Safety Strategy relies heavily on effective enforcement, yet the technological infrastructure across Australia is deeply fractured. In jurisdictions like New South Wales and the Australian Capital Territory (ACT), AI-equipped fixed cameras have virtually replaced the highway patrol for these offences, issuing the overwhelming majority of automated fines. Conversely, states like the Northern Territory, South Australia, and Western Australia remain heavily reliant on human police detection. For decision-makers, this stark divide highlights a massive disparity in infrastructure funding and raises serious questions about the long-term scalability and reach of manual enforcement.

Chapter 4: Does Your Postcode Alter Who Gets Caught?
Despite big differences in the total number of enforcement actions, a study of the population shows that the share of driving offences committed by people aged 26–39 and 40–64 is very similar across almost all states. This nationwide similarity strongly suggests that targeted education campaigns for working-age adults are effective everywhere, regardless of the jurisdiction.

Chapter 5: Is Roadside Justice Equal Across State Lines?
Transparency in the justice system assumes that a split-second mistake carries a consistent penalty, regardless of where the vehicle is registered. However, examining the rate of severe enforcement paints a troubling picture of inequality. While eastern states like Victoria and New South Wales resolve almost all offences with standard fines, the Northern Territory prosecutes nearly a quarter of its detected drivers with criminal charges.

## Policy Page:

Section 1: The Ethics Behind the Numbers: Our Data Philosophy
Narrative Text: > Every statistic on this dashboard begins as a real-world event: a flash of an AI camera on the M4, or a highway patrol stop on a remote outback road. But how does a highly sensitive, split-second traffic incident safely transform into a tool that shapes the National Road Safety Strategy? We believe that for data to drive effective policy, it must be completely transparent to the public
Section 2: Tracking the Trends, Not the Individual
Narrative Text: > Behind every fine, charge, and arrest is an Australian driver. Our mandate is to understand the systemic behaviors driving road trauma, not to monitor citizens. Therefore, privacy is baked into the architecture of this project. All data sourced from the Australian Road Safety Data Hub is aggressively aggregated and de-identified before it ever reaches our servers. We strip away names, license plates, and exact timestamps. We are mapping the demographic pulse of the highway, ensuring that researchers can study the "who, where, and how" of distracted driving without ever compromising the "who exactly."
Section 3: Acknowledging the Infrastructure Bias
Narrative Text: > To make responsible funding and policy decisions, decision-makers must know what the data doesn't show. Data is only as objective as the infrastructure capturing it. By acknowledging these blind spots, we empower researchers to ask better questions rather than drawing false conclusions.
Section 4: Bringing the Black Box into the Light
Narrative Text: > Historically, the granular details of traffic enforcement have been locked away in departmental reports. We built this interactive dashboard because we believe that road safety is a shared public responsibility. For policymakers to confidently allocate millions in infrastructure funding, and for the public and media to trust those decisions, the underlying data cannot exist in a black box.
