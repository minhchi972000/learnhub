# Content format

Every course is a folder under `content/courses/`. Adding a course needs **no code changes**:
create the folder, run `uv run learnhub validate`, restart the server.

```
content/courses/<course-slug>/
├── course.yaml
└── units/
    ├── 01-<unit-slug>/
    │   ├── unit.yaml
    │   ├── lessons/
    │   │   ├── 01-<lesson>.md
    │   │   └── 02-<lesson>.md
    │   ├── quiz.yaml          (optional)
    │   └── flashcards.yaml    (optional)
    └── 02-<unit-slug>/ ...
```

- **Slugs** are lowercase ASCII words joined by `-` (`cau-truc-cau`, not `Cấu trúc câu`).
- A unit folder is named `NN-<slug>`; `NN` sets the order and the slug is the part after the first `-`.
- All files are UTF-8.

## course.yaml

```yaml
title: IELTS Writing Cơ Bản Plus 2
description: Viết câu đúng, phát triển đoạn văn, chinh phục Task 1 & Task 2 – mục tiêu band 5.0+.
language: vi          # UI language hint
level: Band 4.0 → 5.0+
tags: [ielts, writing]
source: "Ghi chú tự tổng hợp từ khóa học Prep #211"   # quote values containing " #"
```

## unit.yaml

```yaml
title: Cấu trúc của câu
summary: Mệnh đề, câu đơn – ghép – phức, ngôn ngữ học thuật và hedging.
lessons:
  - slug: menh-de-va-cau-don
    title: Mệnh đề & câu đơn
    file: 01-menh-de-va-cau-don.md
```

## Lesson Markdown

GitHub-flavoured Markdown (tables, lists, bold, blockquotes). Start at `##` — the lesson
title is rendered by the app. Useful conventions:

- `> 💡 **Mẹo:** ...` for tips, `> ⚠️ **Lỗi thường gặp:** ...` for pitfalls.
- ✅ / ❌ for right/wrong example sentences.

## quiz.yaml

```yaml
questions:
  - id: clause-needs-verb          # unique within the unit
    type: true_false
    prompt: Một mệnh đề bắt buộc phải có động từ.
    answer: true
    explanation: Mệnh đề = chủ ngữ + động từ; thiếu động từ chỉ là cụm từ.

  - id: fanboys-result
    type: single                    # exactly one correct option
    prompt: "Liên từ nào đứng trước **kết quả**?"
    options: [for, so, yet, nor]
    answer: 1                       # 0-based index

  - id: hedging-tools
    type: multi                     # several correct options
    prompt: Chọn các công cụ hedging.
    options: [seem to, always, might, probably]
    answer: [0, 2, 3]

  - id: result-in
    type: fill                      # case/space-insensitive match
    prompt: "Video games can result ___ poor sleep."
    answer: [in]                    # list every accepted spelling
```

`explanation` (optional, Markdown) is shown after the learner submits.

## flashcards.yaml

```yaml
cards:
  - id: hedging-modal
    front: Hedging bằng modal verb
    back: "can / could / may / might + **V-inf**"
    example: Planting trees could help reduce air pollution.   # optional
```

Front/back/example accept inline Markdown.
