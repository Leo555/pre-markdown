# 代码块测试

## 行内代码

使用 `System.out.println("Hello")` 打印输出。

变量 `count` 的值为 `42`。

## Java 代码

```java
public class HelloWorld {
    private static final String TAG = "HelloWorld";
    
    public static void main(String[] args) {
        System.out.println("Hello, World!");
        
        List<String> names = Arrays.asList("Alice", "Bob", "Charlie");
        names.stream()
             .filter(name -> name.length() > 3)
             .map(String::toUpperCase)
             .forEach(System.out::println);
    }
    
    /**
     * 计算斐波那契数列
     * @param n 第n个数
     * @return 斐波那契数
     */
    public static long fibonacci(int n) {
        if (n <= 1) return n;
        long a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            long temp = b;
            b = a + b;
            a = temp;
        }
        return b;
    }
}
```

## Kotlin 代码

```kotlin
data class User(val name: String, val age: Int)

fun main() {
    val users = listOf(
        User("Alice", 25),
        User("Bob", 30),
        User("Charlie", 35)
    )
    
    val result = users
        .filter { it.age >= 30 }
        .sortedByDescending { it.age }
        .joinToString { "${it.name}(${it.age})" }
    
    println("符合条件的用户: $result")
    
    // 协程示例
    runBlocking {
        launch {
            delay(1000L)
            println("World!")
        }
        println("Hello,")
    }
}
```

## Python 代码

```python
import asyncio
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Task:
    """任务数据类"""
    id: int
    title: str
    completed: bool = False
    
class TaskManager:
    def __init__(self):
        self._tasks: List[Task] = []
    
    def add_task(self, title: str) -> Task:
        task = Task(id=len(self._tasks) + 1, title=title)
        self._tasks.append(task)
        return task
    
    def get_pending(self) -> List[Task]:
        return [t for t in self._tasks if not t.completed]

async def main():
    manager = TaskManager()
    manager.add_task("学习 Markdown")
    manager.add_task("编写测试用例")
    
    pending = manager.get_pending()
    for task in pending:
        print(f"待办: [{task.id}] {task.title}")

if __name__ == "__main__":
    asyncio.run(main())
```

## JavaScript / TypeScript

```typescript
interface Config {
  apiUrl: string;
  timeout: number;
  retries?: number;
}

class ApiClient {
  private config: Config;

  constructor(config: Config) {
    this.config = { retries: 3, ...config };
  }

  async fetchData<T>(endpoint: string): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    
    for (let i = 0; i < (this.config.retries ?? 1); i++) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(this.config.timeout),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json() as T;
      } catch (error) {
        if (i === (this.config.retries ?? 1) - 1) throw error;
        console.warn(`重试第 ${i + 1} 次...`);
      }
    }
    throw new Error("不可达");
  }
}
```

## Shell 脚本

```bash
#!/bin/bash

INPUT_DIR="./input"
OUTPUT_DIR="./output"

mkdir -p "$OUTPUT_DIR"

find "$INPUT_DIR" -name "*.txt" -type f | while read -r file; do
    filename=$(basename "$file")
    echo "处理文件: $filename"
    lines=$(wc -l < "$file")
    chars=$(wc -c < "$file")
    echo "  行数: $lines, 字符数: $chars"
    iconv -f GBK -t UTF-8 "$file" > "$OUTPUT_DIR/$filename" 2>/dev/null || \
        cp "$file" "$OUTPUT_DIR/$filename"
done

echo "处理完成！"
```

## SQL

```sql
CREATE TABLE users (
    id          BIGINT PRIMARY KEY AUTO_INCREMENT,
    username    VARCHAR(64)  NOT NULL UNIQUE,
    email       VARCHAR(128) NOT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SELECT 
    u.username,
    COUNT(o.id) AS order_count,
    SUM(o.amount) AS total_amount
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY u.id
HAVING order_count >= 5
ORDER BY total_amount DESC
LIMIT 20;
```

## JSON 配置

```json
{
  "app": {
    "name": "MarkdownViewer",
    "version": "2.0.0",
    "features": {
      "darkMode": true,
      "syntaxHighlight": true,
      "maxFileSize": "100MB",
      "supportedFormats": ["md", "markdown", "txt"]
    }
  }
}
```

## XML

```xml
<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.app">
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```
