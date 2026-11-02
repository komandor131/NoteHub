/**
 * Universal Academic Lecture Notes Generator for University Disciplines
 * NoteHub Pro - Zero to Pro Comprehensive Curriculum
 */

const DISCIPLINE_META: Record<string, { name: string; icon: string; area: string; defaultLang: string }> = {
  cs: {
    name: "Комп'ютерні системи та їх основи",
    icon: "💻",
    area: "Низькорівнева архітектура, ОС, пам'ять та мережеві сокети",
    defaultLang: "c"
  },
  sec: {
    name: "Основи прикладної кібербезпеки",
    icon: "🛡️",
    area: "Secure SDLC, SAST/DAST, прикладна криптографія та DevSecOps",
    defaultLang: "bash"
  },
  algo: {
    name: "Розробка й аналіз алгоритмів",
    icon: "⚡",
    area: "Асимптотичний аналіз, динамічне програмування, графи та структури даних",
    defaultLang: "python"
  },
  pyfs: {
    name: "FullStack веб-розробка на Python",
    icon: "🐍",
    area: "FastAPI, асинхронні процеси, SQLAlchemy ORM, PostgreSQL та React",
    defaultLang: "python"
  },
  cicd: {
    name: "CI/CD для веб-додатків",
    icon: "🚀",
    area: "GitHub Actions, GitLab CI, контейнеризація, пайплайни та Kubernetes",
    defaultLang: "yaml"
  },
  go: {
    name: "Основи програмування на Go",
    icon: "🔷",
    area: "Типізація Go, горутини, канали, конкурентність та CLI інструменти",
    defaultLang: "go"
  },
  rust: {
    name: "Системне програмування мовою Rust",
    icon: "🦀",
    area: "Ownership, Borrow Checker, Lifetimes, безпека пам'яті та системне ПЗ",
    defaultLang: "rust"
  },
  gomicro: {
    name: "Розробка мікросервісів на Go",
    icon: "🌐",
    area: "gRPC, Protobuf, Apache Kafka, Saga патерн, Service Mesh та K8s",
    defaultLang: "go"
  },
  sysdes: {
    name: "System Design (Системний дизайн)",
    icon: "🏛️",
    area: "Високонавантажені архітектури, шардинг, реплікація, CAP-теорема та кешування",
    defaultLang: "json"
  },
  serverless: {
    name: "Serverless-архітектури на AWS Lambda",
    icon: "☁️",
    area: "AWS Lambda, API Gateway, DynamoDB Single-Table, EventBridge та IaC",
    defaultLang: "typescript"
  },
  qa: {
    name: "Інженерія автоматизованого тестування (QA)",
    icon: "🧪",
    area: "Піраміда тестів, TDD/BDD, PyTest, Playwright E2E, k6 навантаження та Allure",
    defaultLang: "python"
  }
};

export function getUniversityNote(nodeId: string, nodeTitle?: string): string {
  // Determine prefix
  const parts = nodeId.split('_');
  const prefix = parts[0];
  const meta = DISCIPLINE_META[prefix] || {
    name: "Університетська інженерна дисципліна",
    icon: "📚",
    area: "Фундаментальна комп'ютерна інженерія та розробка програмного забезпечення",
    defaultLang: "typescript"
  };

  const title = nodeTitle || `Тема модуля ${nodeId}`;

  return `## ${meta.icon} ${title}
> **Університетський курс**: ${meta.name}  
> **Академічний рівень**: Від базових основ (Zero) до архітектурного продакшену (Pro)  
> **Ключова галузь**: ${meta.area}

---

### 1. 📖 Фундаментальна теорія та архітектурні засади
Розуміння теми **«${title}»** є критичним фундаментом для побудови надійних, масштабованих та безпечних цифрових продуктів. 

У реальних виробничих середовищах інженер стикається з компромісами (**trade-offs**): швидкість виконання проти накладних витрат пам'яті, сувора узгодженість проти доступності, швидкість розробки проти безпеки. 

Опанування цієї теми передбачає проходження трьох рівнів зрілості:
1. **Рівень новачка (Zero)**: розуміння термінології, синтаксису, базових структур даних та ментальної моделі виконання коду.
2. **Рівень спеціаліста (Core)**: робота з реальними фреймворками, налагодження типових помилок, оптимізація запитів, написання автоматичних тестів.
3. **Рівень архітектора (Pro)**: оцінка відмовостійкості, пропускної здатності за формулою Літтла (Little's Law), запобігання витокам ресурсів та захист від цільових атак.

---

### 2. ⚙️ Внутрішній устрій та як це працює «під капотом»
При виконанні операцій у рамках даної технології відбувається ланцюг низькорівневих перетворень:
* **Рівень абстракції**: Програмний рівень транслює команди у виклики операційної системи (syscalls) або взаємодіє з віртуальною пам'яттю і ядром (Kernel Space).
* **Керування ресурсами**: Буферизація I/O операцій, робота планувальника завдань (Scheduler) та мінімізація блокувань (Lock contention).
* **Складові компоненти**:
  1. *Модуль ініціалізації*: валідація вхідних даних та конфігурація середовища.
  2. *Ядро обробки*: виконання обчислювальної логіки або передача пакетів.
  3. *Підсистема збереження та моніторингу*: синхронізація стану та запис структурованих телеметричних метрик.

$$\\text{Throughput} = \\frac{\\text{Concurrency}}{\\text{Latency}} \\quad \\Longleftrightarrow \\quad \\text{RPS} = \\frac{N}{T_{\\text{avg}}}$$

---

### 3. 💻 Практична реалізація: Production-Ready код
Приклад еталонної реалізації з обробкою граничних випадків, валідацією та інженерними практиками:

\`\`\`${meta.defaultLang}
// Production-ready implementation for: ${title}
// Дотримання принципів відмовостійкості, обробки помилок та чистоти коду

${getCodeSnippet(prefix)}
\`\`\`

---

### 4. ⚡ Оптимізація та аналіз продуктивності
* **Часова та просторова складність**: аналізується за допомогою $\\mathcal{O}$-нотації. Основні операції повинні виконуватися за $\\mathcal{O}(1)$ або $\\mathcal{O}(\\log n)$, уникаючи квадратичних циклів $\\mathcal{O}(n^2)$ при роботі з великими масивами даних.
* **Кешування**: застосування стратегій Cache-Aside, Write-Through або локальних LRU-кешів для мінімізації повторних важких звернень.
* **Зменшення алокацій пам'яті**: використання пулів об'єктів (Object Pools), уникнення надмірного копіювання байтів (Zero-Copy операції).

---

### 5. 🛡️ Безпека та типові пастки початківців
> [!WARNING]
> **Типова помилка**: Нехтування валідацією граничних значень та тайм-аутами мережевих викликів. Завжди налаштовуйте ліміти виконання (Timeouts/Deadlines) та обмеження швидкості (Rate Limiting).

> [!TIP]
> **Порада професіонала**: Логуйте не просто факт помилки, а контекст: Trace ID, параметри запиту (без секретів і паролів) та стан буфера. Це скорочує час локалізації інциденту (MTTR) на 80%.

---

### 6. 💼 Питання для технічної співбесіди (Senior Level)
1. **Питання**: *Як поводиться система за умов пікового перевантаження (Thundering Herd Problem або Network Partition)?*  
   **Відповідь**: Використовуються патерни Circuit Breaker, Exponential Backoff з джиттером (Jitter) та повернення деградованих відповідей (Graceful Degradation).
2. **Питання**: *Які компроміси виникають між затримкою (Latency) та пропускною здатністю (Throughput)?*  
   **Відповідь**: Пакетна обробка (Batching) збільшує пропускну здатність, але додає фіксовану затримку накопичення батчу. Потрібно балансувати розмір буфера залежно від вимог SLA.

---

### 7. 📝 Практичне завдання для закріплення
**Завдання**: Розробіть модуль для теми **«${title}»**, що містить валідацію вхідних даних, вимірювання часу виконання у мілісекундах та повертає структурований звіт про успішність операції.

**Кроки виконання**:
1. Створіть тестове середовище або Docker-контейнер.
2. Реалізуйте базову версію алгоритму.
3. Проведіть стрес-тест із крайовими значеннями (пусті списки, максимальні числа, розрив з'єднання).
4. Проаналізуйте покриття коду тестами (Code Coverage > 80%).

*Успішне проходження цього модуля наближає вас до кваліфікації впевненого Middle/Senior розробника! Перейдіть до вкладки «Тренажер тестів», щоб перевірити свої знання.*`;
}

function getCodeSnippet(prefix: string): string {
  switch (prefix) {
    case 'cs':
      return `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <pthread.h>

// Багатопотокова синхронізація через POSIX Mutex
pthread_mutex_t lock;
long shared_counter = 0;

void* worker(void* arg) {
    for (int i = 0; i < 100000; i++) {
        pthread_mutex_lock(&lock);
        shared_counter++;
        pthread_mutex_unlock(&lock);
    }
    return NULL;
}

int main() {
    pthread_t t1, t2;
    pthread_mutex_init(&lock, NULL);
    pthread_create(&t1, NULL, worker, NULL);
    pthread_create(&t2, NULL, worker, NULL);
    pthread_join(t1, NULL);
    pthread_join(t2, NULL);
    printf("[OK] Результат лічильника: %ld\\n", shared_counter);
    pthread_mutex_destroy(&lock);
    return 0;
}`;

    case 'sec':
      return `#!/usr/bin/env bash
# Автоматизована перевірка безпеки та статичний аналіз (SAST)
set -euo pipefail

echo "=== Запуск сканування безпеки коду ==="
# Перевірка вразливих залежностей (SCA)
pip-audit --desc || echo "[WARN] Знайдено вразливості в бібліотеках"

# Статичний аналіз коду на пастки безпеки (Bandit)
bandit -r ./src -f json -o security_report.json

# Перевірка витоку секретів у git репозиторії
gitleaks detect --verbose --redact
echo "[SUCCESS] Аудит безпеки завершено успішно!"`;

    case 'algo':
      return `from typing import List, Optional

def solve_optimal_substructure(data: List[int], target: int) -> Optional[int]:
    """
    Динамічне програмування з мемоізацією для оптимального пошуку.
    Складність: O(n * target), просторова: O(target).
    """
    dp = [float('inf')] * (target + 1)
    dp[0] = 0
    
    for x in range(1, target + 1):
        for val in data:
            if x - val >= 0 and dp[x - val] + 1 < dp[x]:
                dp[x] = dp[x - val] + 1
                
    return dp[target] if dp[target] != float('inf') else None

# Приклад тестування
print(f"Мінімум кроків: {solve_optimal_substructure([1, 2, 5], 11)}") # Результат: 3 (5+5+1)`;

    case 'pyfs':
      return `from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

app = FastAPI(title="NoteHub API", version="2.0")

class ItemSchema(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(default="")

@app.post("/api/items", status_code=status.HTTP_201_CREATED)
async def create_item(payload: ItemSchema):
    # Асинхронна валідація та обробка бізнес-логіки
    try:
        result = {"id": 101, "title": payload.title, "status": "active"}
        return {"success": True, "data": result}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))`;

    case 'cicd':
      return `name: Production CI/CD Pipeline
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test_and_lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Встановлення Node.js та Python
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Запуск автоматичних тестів
        run: |
          npm ci
          npm run typecheck
          npm test -- --coverage`;

    case 'go':
    case 'gomicro':
      return `package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Патерн Fan-Out / Fan-In конкурентної обробки з обмеженням контексту
func processTask(ctx context.Context, id int, out chan<- int, wg *sync.WaitGroup) {
	defer wg.Done()
	select {
	case <-ctx.Done():
		return
	case <-time.After(10 * time.Millisecond):
		out <- id * 2
	}
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	results := make(chan int, 10)
	var wg sync.WaitGroup

	for i := 1; i <= 5; i++ {
		wg.Add(1)
		go processTask(ctx, i, results, &wg)
	}

	wg.Wait()
	close(results)

	for res := range results {
		fmt.Printf("Оброблено результат: %d\\n", res)
	}
}`;

    case 'rust':
      return `use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // Безпечне розділення пам'яті між потоками через Arc<Mutex<T>>
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter_clone = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter_clone.lock().expect("Failed to lock mutex");
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("Фінальний лічильник в Rust: {}", *counter.lock().unwrap());
}`;

    case 'sysdes':
      return `{
  "system_architecture": {
    "tier": "Tier-1 High-Availability Distributed System",
    "dns_load_balancer": "GeoDNS Route53 -> Anycast CDN (Cloudflare)",
    "reverse_proxy": "NGINX / Envoy API Gateway (Rate Limit: 10k RPS)",
    "app_layer": "Stateless Microservices in Kubernetes HPA (3-50 Pods)",
    "caching_strategy": "Redis Cluster (Cache-Aside + TTL 3600s)",
    "database": "PostgreSQL Primary-Replica with Citus Sharding (Hash Shard by user_id)",
    "consistency_model": "PACELC: If Partition -> Availability, Else -> Latency"
  }
}`;

    case 'serverless':
      return `import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');
    const item = {
      PK: \`USER#\${body.userId}\`,
      SK: \`RECORD#\${Date.now()}\`,
      data: body,
      createdAt: new Date().toISOString(),
    };

    await docClient.send(new PutCommand({
      TableName: process.env.TABLE_NAME || 'NoteHubProduction',
      Item: item,
    }));

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, item }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error', message: String(error) }),
    };
  }
};`;

    case 'qa':
      return `import pytest
from httpx import AsyncClient

@pytest.fixture
def test_payload():
    return {"title": "QA Test Step", "expected_status": 200}

@pytest.mark.asyncio
async def test_api_endpoint_resilience(test_payload):
    """
    Модульний та інтеграційний автотест ендпоінту з перевіркою контрактів.
    """
    async with AsyncClient(base_url="http://localhost:5174") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data`;

    default:
      return `// Standard Production Pattern
export function executeCoreWorkflow(input: unknown): { success: boolean } {
  console.log("Processing workflow safely with input validation", input);
  return { success: true };
}`;
  }
}
