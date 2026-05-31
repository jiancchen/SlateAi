# May 21 Tennis Follow-Up

## Snapshot
- Main-tour clay picks tracked: `12`
- Main-tour record: `7-5`
- ATP Hamburg / Geneva record: `6-2`
- WTA Strasbourg record: `1-3`
- Roland-Garros qualifying: not fully graded on this pass because the accessible result trail was much less clean than the main-tour boards

The broad read is that the clay-point model did a decent job on the ATP matches and a much worse job on the WTA Strasbourg quarterfinals. The board was directionally useful, but still too willing to trust a stable-looking favorite story when the weekly form lane was flatter or moving against it.

## What Landed

### ATP wins
- `Ignacio Buse over Ugo Humbert`
- `Tommy Paul over Daniel Altmaier`
- `Alex de Minaur over Luciano Darderi`
- `Mariano Navone over Jaume Munar`
- `Casper Ruud over Alexei Popyrin`
- `Learner Tien over Alex Michelsen`

### WTA win
- `Victoria Mboko over Leylah Fernandez`

## What Missed

### WTA Strasbourg misses
- `Marie Bouzkova` lost to `Ann Li`
- `Daria Kasatkina` lost to `Jaqueline Cristian`
- `Shuai Zhang` lost to `Emma Navarro`

### ATP misses
- `Camilo Ugo Carabelli` lost to `Aleksandar Kovacevic`
- `Arthur Rinderknech` lost to `Alexander Bublik`

## What Went Right

### ATP clay-point reads were useful
The stronger ATP calls mostly held where the model had a cleaner combination of:
- better recent clay service-point win rate
- steadier return-point profile
- more reliable market support
- less ambiguous semifinal-style nerve pressure

That was especially true for:
- `Ruud`
- `Tommy Paul`
- `de Minaur`
- `Tien`

### The model handled some live-dog clay spots correctly
`Ignacio Buse` was not just a paper ranking lean. The board treated him as a real weekly-form clay edge and that held. That is the kind of non-obvious tennis spot we want more of.

## What Went Wrong

### WTA weekly-form drift was underweighted
The WTA Strasbourg misses look less like random upsets and more like a weighting problem:
- the model gave too much credit to stable name value
- it did not punish enough when the current-week clay rhythm was flatter than the opponent’s
- it still leaned too hard on “should be steadier” logic when the market was already telling a more balanced story

`Ann Li over Bouzkova` is a good example. The board still treated Bouzkova’s clay floor as a stronger anchor than it really was once the weekly shape and current pricing settled.

### Close-board ATP dogs still need a stronger nerve penalty
`Carabelli` and `Rinderknech` were both live-dog style reads, but they did not clear. These were not horrible picks, but they show that a close clay profile alone is not enough. When the match is structurally fragile, the model still needs a better “who closes cleaner under pressure” layer.

## What This Says About The Model

### Best current signals
- recent clay `SPW%`
- recent clay `RPW%`
- market shape
- current-week rhythm
- rank pressure only as a secondary input

### Signals still too weak
- semifinal / closing nerve
- weekly momentum on the WTA side
- whether a player’s recent clay sample came against soft competition
- when a dog’s weekly form is real versus when it is still too noisy

## What To Improve For May 22

1. Weight `weekly form` more heavily in WTA matches when the clay-point numbers are not clearly dominant.
2. Penalize fragile dog picks more when there is no strong market disagreement.
3. Separate `surface edge` from `closeout edge` so the model can say “better clay fit, worse match-finishing profile.”
4. Keep ATP clay-point reads near the top of the board because that layer held up much better than the WTA side yesterday.

## Practical Takeaway

The May 21 tennis board was not bad, but it was uneven:
- ATP clay reads were solid enough to keep building on.
- WTA Strasbourg was the warning zone.

That means May 22 should not just reuse the same confidence bands. The semifinal board needs:
- tighter confidence on WTA
- more respect for current-week match rhythm
- a clearer separation between `clean side`, `fragile lean`, and `watchlist only`
