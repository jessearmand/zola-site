+++
title = "Why Language?"
date = 2023-04-16T15:37:00+08:00
tags = ["human, condition, artificial, intelligence, agi, life, sentient, aliens, gpt, transformer, neural-network, attention, language, LLM"]
+++

Now, everyone in the AI — if not the whole tech industry — is excited about GPT (Generative Pre-trained Transformer). I have been using it for some time for various things from helping me to generate code snippets in a language, libraries, and framework that I'm not familiar with (mostly written in rust or python), to the general task of searching for new information, researching a travel itinerary, or understanding a new body of knowledge — I [build and fly fpv quadcopters](@/2021-05-31-It-has-been-a-long-time.md) in my freetime, so I did some search for [Friis Transmission Equation](https://www.antenna-theory.com/basics/friis.php) to estimate the range of radio signals. Given the right prompts, it can do a calculation with the right formula on GPT-3.5 or some variants of GPT at [you.com](https://you.com).

For about one year, I've been training and evaluating a custom dataset with neural network models such as YOLO for object detections. YOLO is probably one of the most commonly used, tested and widely deployed neural network architecture at present. But, GPT is a brand new way of processing inputs and generating outputs. I watched some videos discussing about `Transformer` layers, and self-attention mechanism, and finally came accross the [original paper](https://arxiv.org/abs/1706.03762) with the [code being used for training and evaluation of the models](https://github.com/tensorflow/tensor2tensor).

To summarize why a `Transformer` layer is powerful according to the paper, it's in its ability to process a sequence of inputs in parallel compared to a recurrent layer. In terms of algorithmic complexity, the following table taken from the paper clearly describes this:

| Layer Type | Complexity per Layer | Sequential Operations | Maximum Path Length |
|-----------------------------|:---------------:|:----:|:----------:|
| Self-Attention              |  O(n<sup>2</sup> * d)     | O(1) | O(1)                  |
| Recurrent                   |  O(n * d<sup>2</sup>)     | O(n) | O(n)                  |
| Convolutional               |  O(k * n * d<sup>2</sup>) | O(1) | O(log<sub>k</sub>(n)) |
| Self-Attention (restricted) |  O(r * n * d)             | O(1) | O(n/r)                |

Where `n` is the sequence length, `d` is the representation dimension, `k` is the kernel size of convolutions and `r` the size of the neighborhood in restricted self-attention.

As can be observed from the table, the benefit of this approach can be explained in section **7. Why Self-Attention** quoted from the paper:

> Learning long-range dependencies is a key challenge in many sequence transduction tasks. One key factor affecting the ability to learn such dependencies is the length of the paths forward and backward signals have to traverse in the network. The shorter these paths between any combination of positions in the input and output sequences, the easier it is to learn long-range dependencies [12]. Hence we also compare the maximum path length between any two input and output positions in networks composed of the different layer types. 
> 
> As noted in Table 1, a self-attention layer connects all positions with a constant number of sequentially executed operations, whereas a recurrent layer requires O(n) sequential operations. In terms of computational complexity, self-attention layers are faster than recurrent layers when the sequence length n is smaller than the representation dimensionality d, which is most often the case with sentence representations used by state-of-the-art models in machine translations, such as word-piece [38] and byte-pair [31] representations. To improve computational performance for tasks involving very long sequences, self-attention could be restricted to considering only a neighborhood of size r in the input sequence centered around the respective output position. This would increase the maximum path length to O(n/r). We plan to investigate this approach further in future work.
> 
> A single convolutional layer with kernel width k < n does not connect all pairs of input and output positions. Doing so requires a stack of O(n/k) convolutional layers in the case of contiguous kernels, or O(logk(n)) in the case of dilated convolutions [18], increasing the length of the longest paths between any two positions in the network. Convolutional layers are generally more expensive than recurrent layers, by a factor of k. Separable convolutions [6], however, decrease the complexity considerably, to O(k * n * d + n * d<sup>2</sup>). Even with k = n, however, the complexity of a separable convolution is equal to the combination of a self-attention layer and a point-wise feed-forward layer, the approach we take in our model.
> 
> As side benefit, self-attention could yield more interpretable models. We inspect attention distributions from our models and present and discuss examples in the appendix. Not only do individual attention heads clearly learn to perform different tasks, many appear to exhibit behavior related to the syntactic and semantic structure of the sentences.

To illustrate this in a less accurate but easier to understand analogy: 

I will need to take at least 100 milliseconds to process a word, or faster if I have learned and understood the meaning of a word. Longer in the order of seconds or minutes if I never heard the word before and need to look up the word in the dictionary, books, or the internet. 

To process the previous paragraph, I will need to process `55` words. 

```python
>>> words = "I will need to take at least 100 milliseconds to process a word, or faster if I have learned and understood the meaning of a word. Longer in the order of seconds or minutes if I never heard the word before and need to look up the word in the dictionary, books, or the internet."
>>> len(words.split(' '))
55
```
In total that's about 5500 milliseconds or 5.5 seconds. Which could be faster if I understood most of the words written above, but it will be significantly slower if it was written in a different language. 

A `Transformer` could process the sequence of words in parallel at constant sequential operation `O(1)` which I still couldn't imagine how it's capable of doing so, but I trust the author of the paper. At a certain dimension `d` it will increase the computational complexity, but a restricted `Self-Attention` can limit the amount of sequences to `O(n)/r)` which is still impressive.

Back to the topic of this post *Why Language?*. As I learn and self-reflect on this from time-to-time. We have become more intelligent and capable to acquire new knowledge, understanding, and interact with others — humans and machines alike — as we have better languages. Surely, we have other elements of physical gestures, tactile, and vision to further improve the process of learning and interaction. However, the signals produced from such experiences have to be interpreted, processed, and understood as well. We constructed a representation in a language form that could possibly describe those process, as best as we could. 

In most cases we don't actually have a precise *language* to describe what we experience, feel and perceive as a whole. Humans do not think in statistical properties of a signal. We don't measure the amplitude, variance, or means of our vision and stress signals. Even if we are presented with these numbers, how fast can we process them to decide and commit on a specific action? It's significantly slower. 

To a `Transformer` these signals could represent some input sequences, and due to its ability to perform a sequential operation at constant complexity to the dimension of `d` in parallel, it can correlate multiple sequences at once, and very consistent at doing so. This opens up a whole other topic involving the human condition, our intelligence, and existential risks, which I have slightly explored and reflect on it from various discussions surrounding GPT on YouTube and the Internet. But, I have not decided that it's a topic worthy of my full attention, as everyone will pay attention to it eventually, once we live in a very strange society :smile:

A recommended conversation of this topic with Eliezer Yudkowsky who believe that our ability to interpret an AGI (Artificial General Intelligence) or a `GPT` is much slower than its capability to improve further, and there's more on [Lex Fridman channel](https://www.youtube.com/@lexfridman):

{{ youtube(id="41SUp-TRVlg") }}
