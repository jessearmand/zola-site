+++
title = "How much do you grok?"
date = 2026-07-24T17:51:00+08:00
tags = ["grokking", "learning", "LLM", "agents", "rust", "gwern", "essays", "codebase"]
+++

I haven't spent as much time as I should've reading long essay until I read gwern's essays. The last one that struck my mind is this essay about [Nets by Catapulting](https://gwern.net/llm-catapult). I personally don't expect myself to actually be involved in any LLM model pre-training, training or post-training at an AI company. Although, I might spent some time to create a system that resembles a personalized LLM, inspired by another gwern's essay on [Guardian Angels](https://gwern.net/guardian-angel).

However, let me focus on catapulting or grokking, which is the main idea from the essay Human-like Neural Nets by Catapulting.

I don't need to explain about what's in the article or whether a 100T params large language model pretrained on a very narrow and high quality dataset such as gwern's collection of writing style and essays could finally grok writing, or math if we pretrain it on every [3blue1brown](https://www.3blue1brown.com/)'s video frames and their description, or any highly curated subject with rich connectivity to various other related subjects.

What I would like to explain however is my observation on how do we (humans) actually grok a subject. It's started with a root node, and from there we create another child node, and perhaps we branch to a different direction from the root, creating another child node.

At this point we have a tree with two child nodes, and instead of going back to the parent node, we can create another child node on the left, and perhaps this time we descend two more levels before moving upward to create another child on the right. Again, we descend two more levels.

After few hours, days, weeks, months or even years, we have lost track of where we are at the leaf of the tree structure that we've been planning to build. Then, perhaps we're actually building a graph, we came back to a node that we've visited before, but we're not aware of it. At least not instinctively.

Another analogy is when we're exploring a codebase, we're at a particular line of code. Let's take a rust codebase as an example. We encountered a function with parameters. Each parameter has a type, each type has a declaration, and perhaps the type is a `Trait`. Then, perhaps the `Trait` is bounded. It's a `Trait Bound`, and perhaps it's a multiple `Trait Bound` being summed together.

```rust
pub fn notify(item: &(impl Summary + Display)) {
```

Fast forward, we ended up with this:

```rust
fn some_function<T: Display + Clone, U: Clone + Debug>(t: &T, u: &U) -> i32 {
```

or this:

```rust
fn some_function<T, U>(t: &T, u: &U) -> i32
where
    T: Display + Clone,
    U: Clone + Debug,
{
```

Next, perhaps we'd like to implement a method for a generic type, we ended up with:

```rust
use std::fmt::Display;

struct Pair<T> {
    x: T,
    y: T,
}

impl<T> Pair<T> {
    fn new(x: T, y: T) -> Self {
        Self { x, y }
    }
}

impl<T: Display + PartialOrd> Pair<T> {
    fn cmp_display(&self) {
        if self.x >= self.y {
            println!("The largest member is x = {}", self.x);
        } else {
            println!("The largest member is y = {}", self.y);
        }
    }
}
```

Hmmm, what's `PartialOrd`, let me look that up.
What's `std::fmt::Display` ?
What's `Self` and `self`?

The above is a very simplistic process of grokking, which most frontier LLM coding agents have done to a degree where humans are already left behind.

LLM will chase every type, every bound, every declaration without fatigue. What they still lack, at least in the versions I've seen is the higher-order sense of why this particular graph has this particular topology. That sense comes from having lived inside many such graphs and noticing the recurring pressures that shape them. Agents traverse; humans who have done the long expansion start to feel the where it comes from and how it becomes, or perhaps humans will forget all of them, and they'll ask the agents to remind them.

What about you? us? our friends, coworkers, or any stranger you meet in any situation? How much do they grok a system?

We can simply observe the tendency of someone to grok based on how much he / she is willing to perform nested recursive search from the root of the tree to the bottom, expanding various node along the way, until it becomes more than a tree. An unrecognizable structure.

The transition isn't only from tree to graph. It's also a shift in how you orient yourself inside the structure. Early on, navigation is path-dependent: you know where you are mainly by remembering the sequence of expansions that brought you from the root. Later, after enough revisits, jumps, or cycles, you can locate yourself relative to several distant nodes at once, without needing to reconstruct the original path. That change is what turns a system from something you can traverse into something you can actually inhabit and use.

Finally, I've lost track of what am I supposed to write, and how I got here. That's how humans grok, the LLMs could simply use their attention mechanism.

---

*Originally posted on X: [How much do you grok?](https://x.com/jessearmand/status/2080712411498316104)*
