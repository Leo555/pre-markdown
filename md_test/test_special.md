# 特殊语法测试

## 1. 深层嵌套列表

- 第一层 A
  - 第二层 A-1
    - 第三层 A-1-a
      - 第四层 A-1-a-i
        - 第五层 A-1-a-i-α
      - 第四层 A-1-a-ii
    - 第三层 A-1-b
  - 第二层 A-2
- 第一层 B
  1. 有序子项 B-1
  2. 有序子项 B-2
     - 混合嵌套 B-2-a
     - 混合嵌套 B-2-b
       1. 再嵌套 B-2-b-1
       2. 再嵌套 B-2-b-2

## 2. HTML 混合

<details>
<summary>点击展开详情</summary>

这是隐藏的内容区域，包含 Markdown 格式：

- 列表项 1
- 列表项 2

```python
print("Hello from hidden area!")
```

</details>

<div align="center">
  <strong>居中加粗文字</strong>
  <br>
  <em>居中斜体文字</em>
</div>

<table>
  <tr>
    <th>HTML表头1</th>
    <th>HTML表头2</th>
  </tr>
  <tr>
    <td>HTML单元格1</td>
    <td>HTML单元格2</td>
  </tr>
</table>

## 3. 数学公式（LaTeX）

行内公式：$E = mc^2$

独立公式块：

$$
\frac{-b \pm \sqrt{b^2 - 4ac}}{2a}
$$

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

$$
\int_{0}^{\infty} e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$

## 4. 特殊字符与 Emoji

常见 Emoji：🎉 🚀 ✅ ❌ ⚠️ 💡 🔥 📝 🎯 👍

Unicode 特殊字符：© ® ™ § ¶ † ‡ • ° ± × ÷ ≠ ≤ ≥ ∞ ← → ↑ ↓ ↔

中文标点：，。！？：；""''【】《》（）——…

日文：こんにちは 世界

韩文：안녕하세요 세계

阿拉伯文：مرحبا بالعالم

## 5. 超长单行文本

这是一段非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常非常长的文本，用于测试自动换行的效果。

## 6. 连续分割线

---
---
---

## 7. 空标题测试

##

###

## 8. 只有代码的段落

```
无语言标识的代码块
第二行
第三行
```

    缩进4格的代码块
    第二行
    第三行

## 9. 混合引用

> 一级引用
> 
> > 二级引用包含代码：`var x = 1;`
> > 
> > > 三级引用包含**加粗**和*斜体*
> > > 
> > > ```
> > > 引用中的代码块
> > > ```
> 
> 回到一级引用

## 10. 链接的多种写法

[普通链接](https://www.example.com)

[带标题的链接](https://www.example.com "这是标题")

[引用式链接][ref1]

[ref1]: https://www.example.com "引用式链接"

裸链接：https://www.example.com

邮箱链接：<user@example.com>

## 11. 图片语法

![普通图片](https://via.placeholder.com/300x200)

![带标题的图片](https://via.placeholder.com/300x200 "示例图片")

[![可点击的图片链接](https://via.placeholder.com/100x50)](https://www.example.com)

## 12. 定义列表（扩展语法）

术语 1
: 这是术语1的定义

术语 2
: 这是术语2的第一个定义
: 这是术语2的第二个定义

## 13. 大段纯文本

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur?

---

**测试文件结束** 🎉
