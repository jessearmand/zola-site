+++
title = "CROQ review: “Why are all LLMs Obsessed with Japanese Culture?”"
date = 2026-10-24T12:00:00+08:00
description = "arXiv 2604.21751v2 (28 Aug 2026, EMNLP 2026 Findings) and the HF dataset HiTZ/CROQ (commit ffb32c09). Reviewed 23 Oct 2026 (SGT, UTC+8)."
tags = ["LLM", "AI", "research", "papers", "Japanese culture"]
+++

<div class="croq">
<style>
.croq {
  --fg: #1d1f23;
  --mut: #5a6270;
  --line: #e3e6ea;
  --acc: #c0392b;
  --base: #4a6fa5;
  --bg: #fff;
  --soft: #f6f7f9;
  box-sizing: border-box;
  margin: 0;
  max-width: 100%;
  padding: 0;
  color: var(--fg);
  font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}
.croq, .croq * { box-sizing: border-box; }
.croq h1 { font-size: 1.75rem; line-height: 1.25; margin: 0 0 6px; }
.croq h2 { font-size: 1.3rem; margin: 40px 0 10px; padding-top: 8px; border-top: 1px solid var(--line); }
.croq h3 { font-size: 1.05rem; margin: 22px 0 6px; }
.croq .sub { color: var(--mut); margin: 0 0 18px; }
.croq .tldr { background: var(--soft); border-left: 4px solid var(--base); padding: 14px 18px; border-radius: 4px; }
.croq .own { background: #fff7f5; border-left: 4px solid var(--acc); padding: 12px 16px; border-radius: 4px; margin: 14px 0; }
.croq table { border-collapse: collapse; width: 100%; font-size: .92rem; margin: 10px 0; }
.croq th, .croq td { border: none; border-bottom: 1px solid var(--line); padding: 6px 8px; text-align: left; vertical-align: top; }
.croq th { background: var(--soft); font-weight: 600; }
.croq td.n, .croq th.n { text-align: right; }
.croq .wrap { overflow-x: auto; }
.croq figure { margin: 18px 0; }
.croq figure svg { width: 100%; height: auto; font-family: inherit; }
.croq figcaption { color: var(--mut); font-size: .88rem; margin-top: 4px; }
.croq code { background: var(--soft); padding: 1px 5px; border-radius: 3px; font-size: .88em; }
.croq ul { padding-left: 1.2em; }
.croq li { margin: 3px 0; }
.croq a, .croq a:visited { color: #1f5fa8; text-decoration: underline; }
.croq .tag { display: inline-block; font-size: .75rem; font-weight: 600; padding: 1px 7px; border-radius: 10px; margin-right: 6px; }
.croq .ok { background: #e5f4ea; color: #1e6b3a; }
.croq .bad { background: #fbe9e7; color: #9b2c1f; }
.croq footer { color: var(--mut); font-size: .85rem; margin-top: 40px; border-top: 1px solid var(--line); padding-top: 12px; }
@media (max-width: 600px) {
  .croq { font-size: 15px; }
  .croq h1 { font-size: 1.4rem; }
}
</style>
<p class="sub">arXiv 2604.21751v2 (28 Aug 2026, EMNLP 2026 Findings) and the HF dataset HiTZ/CROQ (commit ffb32c09). Reviewed 23 Oct 2026 (SGT, UTC+8).</p>
<div class="tldr"><strong>Bottom line.</strong> The headline finding holds up as a count: in this prompt format, eight frontier models name Japan more than any other country outside the prompt language’s own countries. The explanations (why it happens, and that it starts at supervised fine-tuning) are weakly supported. The dataset has no region or country labels, so it can only be counted by language. The paper never relates Japan to any measure of training data, and my own rough check finds no relationship, with Japan as the biggest outlier.</div>
<h2>1. How reliable is the paper’s conclusion?</h2>
<h3>What the paper claims</h3>
<p>CROQ has 1,320 English questions with no location in them. Each has a placeholder, e.g. <em>“What values shape family life {in region/place}? Be brief. Choose yourself the place.”</em> The questions were machine-translated into 23 more languages (31,680 total). Eight models answered each question once through OpenRouter (temperature 0.7, top-p 0.9): gpt-4o-mini, gemini-2.5-flash, claude-3.5-haiku, llama-4-maverick, command-r-08-2024, magistral-small-2506, deepseek-v3.2-exp and qwen3-next-80b. gpt-4o-mini then extracted up to five countries per answer.</p>
<ul>
<li><strong>Own countries dominate.</strong> Models mostly name countries where the prompt language is official: 43% (Command-r) to 78% (GPT) of references (Table 1).</li>
<li><strong>Japan leads among other countries,</strong> ahead of the US, India, China and France (§5, §6).</li>
<li><strong>Language resources matter.</strong> Languages with more web data get more varied answers: Spearman 0.843 against Common Crawl share (§6, Fig. 2, Table 13).</li>
<li><strong>Training stage.</strong> The bias appears after supervised fine-tuning, not pretraining (§7, Tables 4, 14, 15).</li>
</ul>
<figure><svg viewBox="0 0 640 352" role="img" aria-label="Non-own mentions by country, Table 1 sums" xmlns="http://www.w3.org/2000/svg">
<text x="142" y="36.1" text-anchor="end" font-size="13">Japan</text>
<rect x="150" y="23" width="420.0" height="18" fill="#c0392b" rx="2"/>
<text x="576.0" y="36.1" font-size="12" fill="#333">13,261</text>
<text x="142" y="62.1" text-anchor="end" font-size="13">USA</text>
<rect x="150" y="49" width="301.5" height="18" fill="#4a6fa5" rx="2"/>
<text x="457.5" y="62.1" font-size="12" fill="#333">9,518</text>
<text x="142" y="88.1" text-anchor="end" font-size="13">India</text>
<rect x="150" y="75" width="124.8" height="18" fill="#4a6fa5" rx="2"/>
<text x="280.8" y="88.1" font-size="12" fill="#333">3,940</text>
<text x="142" y="114.1" text-anchor="end" font-size="13">China</text>
<rect x="150" y="101" width="123.8" height="18" fill="#4a6fa5" rx="2"/>
<text x="279.8" y="114.1" font-size="12" fill="#333">3,908</text>
<text x="142" y="140.1" text-anchor="end" font-size="13">France</text>
<rect x="150" y="127" width="101.4" height="18" fill="#4a6fa5" rx="2"/>
<text x="257.4" y="140.1" font-size="12" fill="#333">3,203</text>
<text x="142" y="166.1" text-anchor="end" font-size="13">Italy</text>
<rect x="150" y="153" width="77.8" height="18" fill="#4a6fa5" rx="2"/>
<text x="233.8" y="166.1" font-size="12" fill="#333">2,458</text>
<text x="142" y="192.1" text-anchor="end" font-size="13">Germany</text>
<rect x="150" y="179" width="67.2" height="18" fill="#4a6fa5" rx="2"/>
<text x="223.2" y="192.1" font-size="12" fill="#333">2,122</text>
<text x="142" y="218.1" text-anchor="end" font-size="13">UK</text>
<rect x="150" y="205" width="63.2" height="18" fill="#4a6fa5" rx="2"/>
<text x="219.2" y="218.1" font-size="12" fill="#333">1,995</text>
<text x="142" y="244.1" text-anchor="end" font-size="13">Brazil</text>
<rect x="150" y="231" width="57.0" height="18" fill="#4a6fa5" rx="2"/>
<text x="213.0" y="244.1" font-size="12" fill="#333">1,800</text>
<text x="142" y="270.1" text-anchor="end" font-size="13">Mexico</text>
<rect x="150" y="257" width="56.0" height="18" fill="#4a6fa5" rx="2"/>
<text x="212.0" y="270.1" font-size="12" fill="#333">1,767</text>
<text x="142" y="296.1" text-anchor="end" font-size="13">Egypt</text>
<rect x="150" y="283" width="40.5" height="18" fill="#4a6fa5" rx="2"/>
<text x="196.5" y="296.1" font-size="12" fill="#333">1,280</text>
<text x="142" y="322.1" text-anchor="end" font-size="13">Russia</text>
<rect x="150" y="309" width="23.9" height="18" fill="#4a6fa5" rx="2"/>
<text x="179.9" y="322.1" font-size="12" fill="#333">755</text>
</svg><figcaption>Figure A. Non-own mentions per country, summed over the 8 models (column sums of the paper’s Table 1; only these 12 countries are tabulated). Japan 13,261, USA 9,518.</figcaption></figure>
<h3><span class="tag ok">Solid</span>What holds up</h3>
<ul>
<li><strong>The counts are large and consistent.</strong> Japan has 13,261 non-own mentions vs 9,518 for the US (Table 1). In <em>English</em> prompts, Japan (2,893) beats the US (2,028), even though English counts the US as an “own” country (Table 9).</li>
<li>Japan is the top non-own country, among the 12 tabulated, in <strong>12 of the 23</strong> non-Japanese languages. The US tops the other 11 (my tally from Table 9).</li>
<li><strong>The language-resource correlation reproduces exactly</strong> from the paper’s Tables 6 and 9 (n=24 languages): Pearson 0.498 (p=0.013) and Spearman 0.843 (p=2.3×10⁻⁷). On log Common Crawl share, Pearson is 0.854.</li>
</ul>
<h3><span class="tag bad">Weak / overstated</span>Problems</h3>
<ul>
<li><strong>No uncertainty measures.</strong> One sample per question per model. There are no repeat runs, confidence intervals or significance tests for the Japan result. Only 12 countries are tabulated, so true shares of all mentions can’t be computed.</li>
<li><strong>Internal inconsistencies.</strong>
<ul>
<li>§5 says Japan is the “preferred country for six out of the eight” models; a few lines later it says five. Table 1 gives 5 Japan, 2 US (GPT, Command-r) and 1 tie (Gemini, 1,493 each).</li>
<li>In Japanese prompts, “Own” is 6,213 but the Japan column is 5,584, and Japanese is official in only one country.</li>
<li>Brazil sums to 1,800 in Table 1 but 2,092 in Table 9; the gap equals Galician’s Brazil count (292).</li>
<li>Catalan and Basque prompts count France as an “own” country.</li>
</ul></li>
<li><strong>Question and translation quality.</strong> GPT-5.1 generated the questions and did the translations. People checked 400 translated questions in 6 languages (zh, ko, es, ca, gl, eu), with no agreement statistics (App. A).</li>
<li><strong>The country-extraction step was thinly validated.</strong> The “98%” is the basic-evaluation average (98.48) on 264 items in en, es, ca and eu only. Under stricter scoring it is 95.08, and 86.36 for Basque (Table 7). No agreement between human annotators is reported. It was never checked on Japanese, Amharic, Hausa, Hindi and similar languages. The extractor is gpt-4o-mini, which is also one of the models being evaluated.</li>
<li><strong>The prompt itself is a confounder.</strong> The literal “{in region/place} … choose yourself the place” format invites models to pick a stereotypical example country. Frontier models were tested with this single template only; the prompt check covers only OLMo (App. H). The result may mean “Japan is the default example of a distinctive culture” rather than a broad cultural bias.</li>
<li><strong>Language and culture are entangled.</strong> The “own” share is tied to language by design. The diversity measure (number of distinct countries) shrinks mechanically when a language gets more non-answers: Hausa has 3,270, Hindi 1,706 (Table 9). So the resource correlation partly reflects model ability in those languages. Per model, Pearson is not significant for Llama (p=0.064) or Command-r (p=0.116) (Table 13).</li>
<li><strong>The training-stage claim (RQ3) is thin.</strong> It is English only. Base models got a different few-shot prompt than instruction-tuned models. Base models often failed to answer: Llama-3.1-70B base left 783 of 1,320 unanswered, OLMo-3-7B base 608 (Tables 14, 15). “SFT drives it” rests on 4 OLMo models from 2 families.
<ul>
<li>The paper says entropy falls after instruction tuning “for all models”, but gemma-2-9b rises from 0.70 to 0.71.</li>
<li>It says instruction-tuned models mention more countries, but Qwen2.5-32B drops from 142 to 118 and 72B from 144 to 127 (Table 4).</li>
</ul></li>
<li><strong>The “Why” in the title is never answered.</strong> Appendix I says the experiment “did not clarify the main <em>Why</em> question.”</li>
<li><strong>Data leakage is low risk.</strong> There are no gold answers to leak, but question generation may carry GPT-5.1’s own priors.</li>
</ul>
<h2>2. Which region or country is most represented in the dataset?</h2>
<p><strong>There are no region or country columns.</strong> <code>eval.csv</code> has 1,320 rows × 27 columns: <code>ID</code>, <code>Topic</code>, <code>Sub-topic</code>, plus 24 language columns (<code>en es eu fr ca ko bn hi zh pt sw am as az ha su ar ja ru id de fa el gl</code>). That’s one config (“default”) and one split (“eval”). There are 31,680 non-empty question cells (1,320 × 24, matching §3). All 1,320 English questions contain the placeholder, and a search found no country names.</p>
<p>Every language has the same 1,320 questions (4.17% each), so “representation” exists only as language coverage. The grouping of languages by home region below is mine, not the paper’s:</p>
<figure><svg viewBox="0 0 820 274" role="img" aria-label="Questions by language region" xmlns="http://www.w3.org/2000/svg">
<text x="292" y="36.1" text-anchor="end" font-size="13">Europe excl. Russian (8 langs; 4 of them Spain)</text>
<rect x="300" y="23" width="400.0" height="18" fill="#4a6fa5" rx="2"/>
<text x="706.0" y="36.1" font-size="12" fill="#333">10,560 (33.3%)</text>
<text x="292" y="62.1" text-anchor="end" font-size="13">East Asia (zh, ja, ko)</text>
<rect x="300" y="49" width="150.0" height="18" fill="#4a6fa5" rx="2"/>
<text x="456.0" y="62.1" font-size="12" fill="#333">3,960 (12.5%)</text>
<text x="292" y="88.1" text-anchor="end" font-size="13">South Asia (hi, bn, as)</text>
<rect x="300" y="75" width="150.0" height="18" fill="#4a6fa5" rx="2"/>
<text x="456.0" y="88.1" font-size="12" fill="#333">3,960 (12.5%)</text>
<text x="292" y="114.1" text-anchor="end" font-size="13">Sub-Saharan Africa (sw, am, ha)</text>
<rect x="300" y="101" width="150.0" height="18" fill="#4a6fa5" rx="2"/>
<text x="456.0" y="114.1" font-size="12" fill="#333">3,960 (12.5%)</text>
<text x="292" y="140.1" text-anchor="end" font-size="13">MENA (ar, fa)</text>
<rect x="300" y="127" width="100.0" height="18" fill="#4a6fa5" rx="2"/>
<text x="406.0" y="140.1" font-size="12" fill="#333">2,640 (8.3%)</text>
<text x="292" y="166.1" text-anchor="end" font-size="13">Southeast Asia (id, su)</text>
<rect x="300" y="153" width="100.0" height="18" fill="#4a6fa5" rx="2"/>
<text x="406.0" y="166.1" font-size="12" fill="#333">2,640 (8.3%)</text>
<text x="292" y="192.1" text-anchor="end" font-size="13">Russian (ru)</text>
<rect x="300" y="179" width="50.0" height="18" fill="#4a6fa5" rx="2"/>
<text x="356.0" y="192.1" font-size="12" fill="#333">1,320 (4.2%)</text>
<text x="292" y="218.1" text-anchor="end" font-size="13">English (en)</text>
<rect x="300" y="205" width="50.0" height="18" fill="#4a6fa5" rx="2"/>
<text x="356.0" y="218.1" font-size="12" fill="#333">1,320 (4.2%)</text>
<text x="292" y="244.1" text-anchor="end" font-size="13">Azerbaijani (az)</text>
<rect x="300" y="231" width="50.0" height="18" fill="#4a6fa5" rx="2"/>
<text x="356.0" y="244.1" font-size="12" fill="#333">1,320 (4.2%)</text>
</svg><figcaption>Figure B. Questions by language home region (my grouping; 31,680 total). Spain alone has 4 of the 24 languages (es, eu, ca, gl): 5,280 questions, 16.7%.</figcaption></figure>
<p>By language, <strong>Europe is most represented</strong> (33.3%; 37.5% counting Russian), and <strong>Spain is the single biggest country</strong> (16.7%), matching the authors’ Basque institution.</p>
<p><strong>Topics</strong> are uneven (<code>Topic</code> column): Arts has 180 questions (13.6%), Health 80 (6.1%). Every one of the 66 subtopics has exactly 20.</p>
<p><strong>In the model answers</strong>, Japan is the most-mentioned non-own country: 13,261 of 46,007 mentions (28.8%) across the 12 countries in Table 1. The US has 9,518 (20.7%).</p>
<h2>3. How does Japan’s showing correlate with training data about Japanese culture?</h2>
<p>The paper doesn’t score Japan’s “performance” (there is no accuracy); it counts how often models pick Japan. It has <strong>no measure of data about Japanese culture</strong> and runs no country-level correlation for Japan.</p>
<ul>
<li><strong>Its only data measure</strong> is each prompt language’s Common Crawl share (snapshot CC-MAIN-2025-43, Table 6). It correlates that only with answer diversity (Table 13). Japanese is 5.2018%, 4th of 24 languages.</li>
<li><strong>What it says about Japan:</strong> #1 overall and top in 9 of 11 topics. It falls to 3rd in Politics and 4th in History (§5, Table 11).</li>
<li><strong>Post-training data doesn’t explain it either</strong> (App. I, Table 16). Japan is only modestly present in OLMo’s fine-tuning data, yet OLMo-3-7B-Instruct names Japan 478 times vs 171 for the US (Table 15).</li>
</ul>
<div class="own"><strong>My own check, using rough public stand-ins (not from the paper).</strong> For each of the paper’s 12 countries, I compared its non-own mentions (Table 9) against two measures of its main language: Common Crawl share (CC-MAIN-2025-43, from the public stats CSV) and the Wikipedia article count for that language edition (MediaWiki siteinfo API, fetched 23 Oct 2026).</div>
<figure><svg viewBox="0 0 640 420" role="img" aria-label="Scatter of log Common Crawl share vs non-own mentions" xmlns="http://www.w3.org/2000/svg">
<rect x="70" y="20" width="540" height="345" fill="#fafafa" stroke="#ddd"/>
<line x1="70.0" y1="20" x2="70.0" y2="365" stroke="#e6e6e6"/><text x="70.0" y="383" text-anchor="middle" font-size="12">0.1%</text>
<line x1="250.0" y1="20" x2="250.0" y2="365" stroke="#e6e6e6"/><text x="250.0" y="383" text-anchor="middle" font-size="12">1%</text>
<line x1="430.0" y1="20" x2="430.0" y2="365" stroke="#e6e6e6"/><text x="430.0" y="383" text-anchor="middle" font-size="12">10%</text>
<line x1="610.0" y1="20" x2="610.0" y2="365" stroke="#e6e6e6"/><text x="610.0" y="383" text-anchor="middle" font-size="12">100%</text>
<line x1="70" y1="319.0" x2="610" y2="319.0" stroke="#e6e6e6"/><text x="64" y="323.0" text-anchor="end" font-size="12">1,000</text>
<line x1="70" y1="209.3" x2="610" y2="209.3" stroke="#e6e6e6"/><text x="64" y="213.3" text-anchor="end" font-size="12">3,000</text>
<line x1="70" y1="89.0" x2="610" y2="89.0" stroke="#e6e6e6"/><text x="64" y="93.0" text-anchor="end" font-size="12">10,000</text>
<line x1="70.0" y1="255.2" x2="610.0" y2="182.5" stroke="#888" stroke-dasharray="5,4"/>
<circle cx="379.9" cy="60.8" r="7" fill="#c0392b" fill-opacity="0.85"/>
<text x="387.9" y="64.8" font-size="12" text-anchor="start" font-weight="700" fill="#c0392b">Japan (13,261)</text>
<circle cx="547.3" cy="93.9" r="5" fill="#4a6fa5" fill-opacity="0.85"/>
<text x="555.3" y="87.9" font-size="12" text-anchor="start" >USA (9,518)</text>
<circle cx="123.1" cy="182.0" r="5" fill="#4a6fa5" fill-opacity="0.85"/>
<text x="131.1" y="186.0" font-size="12" text-anchor="start" >India (3,940)</text>
<circle cx="377.2" cy="182.9" r="5" fill="#4a6fa5" fill-opacity="0.85"/>
<text x="369.2" y="176.9" font-size="12" text-anchor="end" >China (3,908)</text>
<circle cx="366.6" cy="202.7" r="5" fill="#4a6fa5" fill-opacity="0.85"/>
<text x="358.6" y="194.7" font-size="12" text-anchor="end" >France (3,203)</text>
<circle cx="305.5" cy="229.2" r="5" fill="#4a6fa5" fill-opacity="0.85"/>
<text x="313.5" y="233.2" font-size="12" text-anchor="start" >Italy (2,458)</text>
<circle cx="547.3" cy="250.0" r="5" fill="#4a6fa5" fill-opacity="0.85"/>
<text x="555.3" y="264.0" font-size="12" text-anchor="start" >UK (1,995)</text>
<circle cx="385.4" cy="243.8" r="5" fill="#4a6fa5" fill-opacity="0.85"/>
<text x="393.4" y="237.8" font-size="12" text-anchor="start" >Germany (2,122)</text>
<circle cx="366.9" cy="262.1" r="5" fill="#4a6fa5" fill-opacity="0.85"/>
<text x="374.9" y="276.1" font-size="12" text-anchor="start" >Mexico (1,767)</text>
<circle cx="313.5" cy="245.3" r="5" fill="#4a6fa5" fill-opacity="0.85"/>
<text x="305.5" y="257.3" font-size="12" text-anchor="end" >Brazil (2,092)</text>
<circle cx="388.0" cy="347.1" r="5" fill="#4a6fa5" fill-opacity="0.85"/>
<text x="396.0" y="351.1" font-size="12" text-anchor="start" >Russia (755)</text>
<circle cx="217.6" cy="294.3" r="5" fill="#4a6fa5" fill-opacity="0.85"/>
<text x="225.6" y="298.3" font-size="12" text-anchor="start" >Egypt (1,280)</text>
<text x="340.0" y="408" text-anchor="middle" font-size="12">Common Crawl share of country’s main language, CC-MAIN-2025-43 (log scale)</text>
<text transform="translate(16,192.5) rotate(-90)" text-anchor="middle" font-size="12">Non-own mentions, Table 9 (log scale)</text></svg><figcaption>Figure C (my own check). Each dot is a country. The dashed line is a log-log least-squares fit. Japan (red) is the largest positive outlier, about 4.6× above the trend. The US and UK share English (44.83%).</figcaption></figure>
<div class="wrap"><table><tr><th>Comparison</th><th>n</th><th>Pearson (log-log)</th><th>Spearman</th><th>Japan vs trend</th></tr><tr><td>Common Crawl share</td><td>12</td><td>0.200 (p=0.53)</td><td>0.011 (p=0.97)</td><td>4.61× above, rank #1</td></tr><tr><td>Wikipedia article count</td><td>12</td><td>0.008 (p=0.98)</td><td>-0.074 (p=0.82)</td><td>4.75× above, rank #1</td></tr><tr><td>Common Crawl share, UK dropped</td><td>11</td><td>0.311 (p=0.35)</td><td>0.118 (p=0.73)</td><td>4.20× above, rank #1</td></tr><tr><td>Wikipedia, UK dropped</td><td>11</td><td>0.074 (p=0.83)</td><td>0.009 (p=0.98)</td><td>4.63× above, rank #1</td></tr></table></div>
<p>There is essentially no correlation, and Japan is the biggest positive outlier, followed by the US.</p>
<p><strong>Limitations:</strong> n is 11–12. Data <em>in</em> Japanese is not the same as data <em>about</em> Japanese culture. “Own” is defined by official language, and only 12 countries are covered. Common Crawl shares here come from the public CSV and differ slightly from the paper’s Table 6 (Japanese 5.2703% vs 5.2018%).</p>
<p>One Japan-specific pattern does exist. Across the 23 non-Japanese prompt languages, Japan mentions rise with the prompt language’s Common Crawl share (Spearman 0.868, p=8×10⁻⁸). Japan’s share of the 12-country non-own mentions also rises (Spearman 0.69). This is confounded: data-rich languages produce fewer own-country answers and fewer non-answers, so everything non-own goes up.</p>
<details><summary>Input data for my check</summary><div class="wrap"><table><tr><th>Country</th><th>Language</th><th class="n">Non-own mentions (Table 9)</th><th class="n">Common Crawl share</th><th class="n">Wikipedia articles</th></tr><tr><td>Japan</td><td>ja</td><td>13,261</td><td>5.2703%</td><td>1,523,936</td></tr><tr><td>USA</td><td>en</td><td>9,518</td><td>44.8292%</td><td>7,253,926</td></tr><tr><td>India</td><td>hi</td><td>3,940</td><td>0.1972%</td><td>172,143</td></tr><tr><td>China</td><td>zh</td><td>3,908</td><td>5.0878%</td><td>1,562,263</td></tr><tr><td>France</td><td>fr</td><td>3,203</td><td>4.4414%</td><td>2,786,081</td></tr><tr><td>Italy</td><td>it</td><td>2,458</td><td>2.0349%</td><td>1,992,056</td></tr><tr><td>Germany</td><td>de</td><td>2,122</td><td>5.6512%</td><td>3,160,203</td></tr><tr><td>Brazil</td><td>pt</td><td>2,092</td><td>2.2523%</td><td>1,185,716</td></tr><tr><td>UK</td><td>en</td><td>1,995</td><td>44.8292%</td><td>7,253,926</td></tr><tr><td>Mexico</td><td>es</td><td>1,767</td><td>4.4619%</td><td>2,145,062</td></tr><tr><td>Egypt</td><td>ar</td><td>1,280</td><td>0.6604%</td><td>1,338,044</td></tr><tr><td>Russia</td><td>ru</td><td>755</td><td>5.8427%</td><td>2,124,273</td></tr></table></div></details>
<h2>Verdict</h2>
<ul>
<li><span class="tag ok">Well supported</span>In this prompt format, LLMs name Japan disproportionately.</li>
<li><span class="tag bad">Overstated</span>“Bias across all models”: 5 of 8 models favour Japan (2 favour the US, 1 tie).</li>
<li><span class="tag bad">Suggestive at best</span>The causes, and “it emerges at SFT” (English only, 4 OLMo models, confounded by prompt format).</li>
<li><span class="tag bad">Not explained</span>Japan’s prominence doesn’t follow any measure of data volume the paper or I could test.</li>
</ul>
<footer><strong>Sources.</strong>
<a href="https://arxiv.org/html/2604.21751v2">arXiv 2604.21751v2 (HTML)</a> ·
<a href="https://huggingface.co/datasets/HiTZ/CROQ">HF dataset HiTZ/CROQ</a> ·
<a href="https://commoncrawl.github.io/cc-crawl-statistics/plots/languages.csv">Common Crawl language stats CSV</a> ·
<a href="https://ja.wikipedia.org/w/api.php?action=query&amp;meta=siteinfo&amp;siprop=statistics&amp;format=json">MediaWiki siteinfo API (example: ja)</a>.<br>
Method: pandas on <code>eval.csv</code>; paper tables parsed from the arXiv HTML; scipy for correlations. Scripts and outputs are in <code>/workspace/croq/</code> (<code>analysis.py</code>, <code>results.json</code>, <code>make_report.py</code>).</footer>
</div>
