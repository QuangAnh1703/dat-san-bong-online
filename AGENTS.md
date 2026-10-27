# AGENTS.md - SanBong.vn

Hướng dẫn cho mọi AI coding agent (Claude Code, Codex, Cursor, Copilot...) làm việc trên repo này.

Quy ước dự án (tech stack, cách chạy, Git flow, commit, lỗi API, migration, design system) nằm trong
[`CLAUDE.md`](CLAUDE.md) - đọc trước khi sửa code.
Kiến trúc tổng thể và các quy tắc thiết kế bắt buộc: [`docs/design/system-design.md`](docs/design/system-design.md).

## Skills

Claude Code tự nạp skill trong `.claude/skills/`; agent khác hãy đọc `SKILL.md` tương ứng trước khi làm loại việc dưới đây.

| Skill | Dùng khi | File |
|---|---|---|
| `api-design` | Thêm/sửa endpoint REST | [`.claude/skills/api-design/SKILL.md`](.claude/skills/api-design/SKILL.md) |
| `database-migrations` | Thay đổi schema/seed, viết migration mới | [`.claude/skills/database-migrations/SKILL.md`](.claude/skills/database-migrations/SKILL.md) |
| `frontend-design` | Dựng màn hình mới / làm lại giao diện | [`.claude/skills/frontend-design/SKILL.md`](.claude/skills/frontend-design/SKILL.md) |

`frontend-design` là hướng dẫn thiết kế chung: với dự án này, design system trong `CLAUDE.md` (giao diện tối, màu nhấn
theo vai trò, Plus Jakarta Sans, `PageLayout`/`Modal`) là cố định - không tự đổi palette/font.

Thêm skill mới: tạo `.claude/skills/<tên>/SKILL.md` (frontmatter `name`, `description`) rồi thêm một dòng vào bảng trên
và bảng Skills trong `CLAUDE.md`.
