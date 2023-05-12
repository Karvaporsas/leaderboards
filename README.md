# Leaderboards bot

This is a lovely little bot for telegram that [Leaderboards bot](https://t.me/Mayhemboardbot) implements. Currently it does not track historical progress, only latest scores.

Userinfo is common for given user across all chats or groups. That way you can give your weight and height to the bot privately, if you so wish. Scores are also global, but you can only see scores from users that are in the same chat as you and the bot.

When setting own records, no 1RM is required. If user inserts score with more reps than one, a theoretical 1RM is calculated using [Brzycki](https://en.wikipedia.org/wiki/One-repetition_maximum)'s formula.

Leaderboard also shows calculated [Wilk's coefficient](https://en.wikipedia.org/wiki/Wilks_coefficient) for your calculated 1RM score.

Bodyweight exercises are calculated a bit differently using a small sample size correction to 1RM estimate. This will be improved if necessary. 

## Known commands

When used, each command starts with /-sign, like so

> /setscore


- **setscore** - Set your score for an exercise
- **setuserinfo** - Set your own information
- **leaderboards** - See channel leaderboards

## Excercise groups 

Bot calculates also combined scores for aggregated results. These are:

### The big three
Deadlift, bench preaa and squat combined score from estimated 1RM's

### The big five
The big three plus overhead press and curl.

### Bodyweight 
Pull ups and dips. 1RM weight is being calculated a bit differently than other exercises to give more realistic scores.

## GDPR

Obviously stores some userdata, duh. Use at your own risk.
