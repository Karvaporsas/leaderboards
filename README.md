# Leaderboards bot

This is a lovely little bot for telegram that [Leaderboards bot](https://t.me/Mayhemboardbot) implements. Currently it does not track historical progress, only latest scores.

Userinfo is common for given user across all chats or groups. That way you can give your weight and height to the bot privately, if you so wish. Scores are currently chat specific.

When setting own records, no 1RM is required. If user inserts score with more reps than one, a theoretical 1RM is calculated using [Brzycki](https://en.wikipedia.org/wiki/One-repetition_maximum)'s formula.

## Known commands

When used, each command starts with /-sign, like so

> /setscore


- **setscore** - Set your score for an exercise
- **setuserinfo** - Set your own information
- **leaderboards** - See channel leaderboards


## GDPR

Obviously stores some userdata, duh. Use at your own risk.