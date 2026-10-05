# Growth Terminal Instagram Conversion System v2

This system exists because the studio feed had become visually inconsistent and strategically passive. The last seven studio posts recorded zero public engagement, while Instagram reach and save/share insights are currently unavailable to the collector because the connected token is not returning media insights. That means the feed is clearly not earning visible engagement, but the repository cannot honestly claim to know conversion rate or reach yet.

## What changed

The conversion system is not an educational-post system. The account sells interactive websites, product launches, 3D scroll experiences, and custom digital experiences. The artwork must therefore demonstrate or sell those services directly.

The visual hierarchy is fixed: one dominant visual, one short hook, one clear next action. The hero visual must occupy most of the frame. A navigation strip, tiny typography, blank field, or abstract filler cannot count as the hero.

The house type stack for conversion creative is Inter Tight plus JetBrains Mono. Inter Tight 700/800 carries the hook. Inter Tight 600 carries the single support sentence. JetBrains Mono is limited to metadata and service labels. Fraunces is intentionally removed from this system so the feed does not drift between unrelated visual personalities.

Signal Orange remains the only accent. Ink, warm white, and paper are the neutral field. Orange is used to direct the eye, never to fill space.

## Conversion architecture

Every publishable post must belong to one of four archetypes:

- **Experience demo**: show the interactive behavior or product state.
- **Buyer problem**: show the visual gap between a conventional site and the experience the buyer needs.
- **Launch transformation**: show a reveal, sequence, or before/after that makes the launch feel different.
- **Process proof**: show a real deliverable or system artifact that makes the custom process tangible without inventing client results.

The rotation target is 70% selling or demonstration, 20% process/proof, 10% point of view. Generic education is not a conversion objective.

## Hard visual rules

A feed asset is 1080 × 1350. Keep 72 px safe margins. The hero visual should occupy at least 58% of the canvas. Text should not exceed roughly 28% of the visual area.

The hook is 3 to 7 words, 82 to 132 px, and no more than three lines. Support is optional, 14 words maximum. The CTA is always visible on the artwork.

Do not publish:
- website header crops
- full navigation bars inside the creative
- blank or low-information fields
- generic educational cards
- body-copy posters
- generic AI abstraction
- decorative 3D objects with no relation to the service
- random section numbers
- multiple competing calls to action

If the visual does not demonstrate the offer, it fails.

## Conversion briefs

`studio_conversion_briefs.json` contains the first eight creative directions. They are intentionally not approved for publishing until the final artwork exists and is reviewed. That keeps the autoposter fail-closed rather than allowing a good copy brief to become a bad visual.

## Measurement warning

`performance_log.json` currently has no successful Instagram insights payloads. Likes and external comments are still collected, but reach, saves, shares, and views cannot be trusted until the Meta token is returning media insights. The creative system can be improved now, but it must not pretend to optimize conversion on data the account is not actually collecting.
