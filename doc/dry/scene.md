# Scene

## id
*Required*

Each scene must have an id, but you don't set this manually. For scene
files, the id will be taken from the filename, so a file called
`farm.scene.dry` will contain a scene with the id of `farm`. To avoid
filenames getting out of synch with their contents, defining an `id`
property in the file will raise an error.

Within a scene file you can define further scenes with a line starting with
the `@` symbol, followed by its id. So if the following example is the file
`farm.scene.dry`, there will be three scenes, with ids of `farm`, `barn`,
and `stables`:

    title: The Farm

    You enter the abandoned farm...

    - @barn: Visit the barn.
    - @stables: Visit the stables.

    @barn

    You enter the old hay barn...

    @stables

    You enter the tumbledown stables...

## type
*Required*

The type for a scene must be `scene`. You normally don't set this manually.
For filenames with three components (such as `fairground.scene.dry`), Dendry
takes the second component and interprets it as the type.

If you use a filename with just an id and the `dry` file extension
(`fairground.dry`, for example), then Dendry wouldn't know what type it is,
and you'd have to specify it in the file with the type property. This isn't
recommended, it is easier to organise your project if files clearly show
what type they contain. The starter project Dendry creates for you uses this
three-component naming.

If you did go for two component filenames, a file called `fairground.dry`
could contain:

    type: scene
    title: Investigate the Fairground

    At night the ferris wheel is a spiders web silhouetted against the city...

If the type is contained in the filename, it is an error to also include it
as a property in the file.

In a scene file, you can define multiple scenes with lines beginning with
the `@` symbol. You do not use the type parameter: whether you've specified
the type in the filename or in a type property at the top level, Dendry
knows that only scenes can appear in the file.


## signal

## style


## tags

Tags allow a group of scenes to be offered as choices to the player without specifying them one by one. If there are a series of scenes with the tags property:

    tags: mall-shop

Then in another scene, you can give the option as:

    - #mall-shop

and rather than one option appear, each shop will be listed for the player
to choose. The options will be in order of each scene's order property. If
two scenes have the same order property, then they may appear in any order,
it depends on the whim of the computer. If an order property isn't set, it
is assumed to be zero.

The set of options offered can also be adjusted by only offering a random
subset of the scenes with that tag. See the [Options](#options)
documentation for more details of how this works.

Multiple tags can be comma or semi-colon separated:

    tags: mall-shop, open-sundays

Tags can also be used in custom game code to find scenes, or to determine
how a scene should be displayed. In the **Descend** example game, scenes are
used to determine which dungeon levels a room can be on, and what background
image should be used to display it. For example

    tags: level1, level2, bg-stairs


## title

## subtitle

## unavailable subtitle


## view if

## choose if

## order

## priority

## frequency


## max visits

Controls the maximum number of times a scene can be visited from a choice.
The scene can still be forced if it appears in a go-to property, or by using
the `goToScene` API function from your own code, but Dendry's run time will
honor the maximum visits when displaying the available choices of scene.

    max visits: 1

    You receive a once in a lifetime opportunity...

This value cannot be greater than the count-visits-max property. If
count-visits-max is not set, it will be implicitly set to be equal to
max-visits. If count-visits-max is less than max-visits, Dendry will raise
an error.

## count visits max

Keeps track of the number of times this scene has been visited, up to the
given maximum number. If this property is set, then expressions can find the
current count in by prefixing the id of the scene with the `@` sign. So, for
a scene with an id of `club`, the current visit count will be available as
`@club`.

Successive visits after that will not increase the count. If this property
is not set, then Dendry won't keep track of how often the scene is visited,
so `@club` cannot be used in expressions (it will always be zero).

    count visits max: 2
    go to: newbie if @club = 0; welcome if @club = 1; regular if @club = 2

    @newbie

    Here's your membership for the club...

    @welcome

    Welcome, please enjoy the facilities...

    @regular

    Welcome back, great to see you again...

This value is required by max-visits, so if it is not set, Dendry will
automatically set it to the same value as max-visits. If count-visits-max is
less than max-visits, then max-visits would have no effect. To prevent your
game silently failing, Dendry raises an error in this case.

## on arrival

## on departure

## on display


## go to

If this property is set, Dendry goes to one of the scenes listed,
immediately after displaying this scene's content. Multiple scenes can be
listed in a go-to property, separated by semi-colons. If this scene has
choices to offer to the player, as well as a go-to property, the choices
will be ignored: Dendry moves right on to the new scene.

    go to: flip-heads; flip-tails

Each of the scenes in the go-to property can be followed by an if expression
that allows you to control when a new scene will be chosen:

    go to: flip-heads if luck > 2; flip-tails if luck < 5

In this example, if the `luck` quality is 2 or less, we'll always go to the
`flip-tails` scene. If the quality is 3 or 4, the two scenes will be chosen
at random. If the quality is 5 or more, the `flip-heads` scene will be
chosen.

Dendry chooses one of the valid scenes from a go-to property at random, with
each choice equally likely. To skew the probability, you can repeat a scene
in the property, so:

    go to: roll-pass; roll-fail; roll-fail; roll-fail; roll-fail; roll-fail

would have a five out of six chance of going to the `roll-fail` scene.
Repeated scenes can have different if expressions to further tune the
probabilities.

## new page

## game over

## set root


## min choices

## max choices


## content
*Required*


# Sub Scenes


# Options
<a name="options"></a>

## id
*Required*

## title

## subtitle

## unavailable subtitle

## view if

## choose if

## order

## priority

## frequency