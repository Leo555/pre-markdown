# Cherry Markdown Compatibility — Math Syntax

## Inline Math

Einstein's famous equation: $E=mc^2$

The quadratic formula: $x = \frac{-b \pm \sqrt{b^2-4ac}}{2a}$

Inline with text: The value of $\pi$ is approximately 3.14159.

## Block Math

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

$$
\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$

$$
\begin{aligned}
f(x) &= x^2 + 2x + 1 \\
&= (x+1)^2
\end{aligned}
$$

## Edge Cases

Empty math: $$

Single character: $x$

With special chars: $a < b > c$

Nested braces: $\frac{\frac{a}{b}}{c}$
