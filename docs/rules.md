# Werewolf Launch Ruleset

## Overview
This ruleset defines the minimum viable Werewolf experience targeted for launch. It captures the player roles currently available in the codebase, the flow of each phase, and the victory conditions that a play session must enforce. Optional variants and outstanding implementation gaps are captured so downstream workstreams can plan their deliverables.

## Lobby & Setup
- **Player Counts:** A lobby can start once 5 or more players are ready. The game currently scales the number of Werewolves to roughly 25% of the lobby, rounded down but never below one.
- **Role Assignment:** Roles are assigned randomly at game start. Special roles are added based on lobby size before filling the remaining seats with Villagers:
  - Seer unlocked at ≥6 players.
  - Doctor unlocked at ≥7 players.
  - Hunter unlocked at ≥9 players.
- **Host Responsibilities:** The lobby host is whoever created the room (or the first player, if the host leaves). Only the host may trigger the start button.

## Roles Available at Launch
| Role | Alignment | Ability Summary | Notes |
| --- | --- | --- | --- |
| Werewolf | Wolves | Collaborate at night to eliminate one target. Wolves win when they reach parity with the town. | Multiple wolves share a single kill target each night. Packmates are surfaced privately in the night UI so they can coordinate. |
| Villager | Town | No night action; participates in day discussion and voting. | Baseline town role filling remaining seats. |
| Seer | Town | Once per night, learns whether a chosen player is a Werewolf. Result is private to the Seer. | Only the most recent inspection result is surfaced to the player in the current UI. |
| Doctor | Town | Once per night, chooses a player to protect from the Werewolves. If the protected target is the one attacked, they survive. | May target themselves or the same player on consecutive nights (current implementation has no limits). |
| Hunter | Town | When killed, chooses a player to take down with them. | Fully implemented: the Hunter receives a revenge prompt immediately after death (including chain reactions). |

## Game Phases
1. **Lobby:** Players join, choose display names, and ready up. The host can start the game once the minimum player count is satisfied.
2. **Night:**
   - Werewolves secretly agree on a single target.
   - Seer selects a player to inspect; they are told whether that player is a Werewolf.
   - Doctor selects a player to protect; a protected target survives a Werewolf attack.
   - Night ends automatically once all required night actions are submitted.
3. **Day:**
   - The previous night’s outcome (deaths, if any) is revealed to all players through the live event feed and history log.
   - Surviving players discuss and cast public votes to eliminate someone.
   - If exactly one target has the highest votes, they are eliminated; ties result in no elimination.
   - Day ends automatically once every alive player has a recorded vote.
4. **Endgame:** The game enters the `ENDED` phase when a victory condition is met. At this point all roles are revealed to every player, and a winner banner is displayed.

## Victory Conditions
- **Town Victory:** All Werewolves have been eliminated.
- **Werewolf Victory:** Werewolves achieve parity with the town (i.e., wolves ≥ living non-wolves).
- **Draws:** Not currently supported; ties during day voting simply skip the elimination.

## Optional Future Variants
These concepts were surfaced during stakeholder discussions but are deferred past launch:
- **Role Reveal Variants:** Allow hosts to choose between full reveal, alignment-only reveal, or no reveal upon death.
- **Doctor Cooldowns:** Restrict consecutive self-saves or repeat targets to increase difficulty.
- **Seer Result Log:** Allow the Seer to reference historical inspections instead of only the latest result.
- **Additional Roles:** Bodyguard, Lycan, and Troublemaker were requested as potential post-launch additions.

## Known Implementation Gaps
The current build meets the launch criteria: werewolves learn their packmates, day/night outcomes are broadcast as they resolve, and the Hunter death queue is playable end-to-end. Future polish should focus on optional quality-of-life work (extended role variants, accessibility improvements, analytics) rather than blocking gameplay defects.
