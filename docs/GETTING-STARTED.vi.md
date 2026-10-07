# Bắt đầu sử dụng Git Commit Test Graph

## Hướng dẫn này dành cho ai?

Hướng dẫn này dành cho Fresher, Junior và bất kỳ developer nào lần đầu sử dụng GCTG.

Bạn không cần biết MCP, graph theory, compiler internals hoặc AI agent để bắt đầu.

## Quy trình đầu tiên

### 1. Kiểm tra yêu cầu

```bash
node --version
git --version
```

Node.js 20 trở lên và Git là cần thiết.

### 2. Cài đặt GCTG

```bash
npm install -g git-commit-test-graph
```

### 3. Chuyển tới project Git cần phân tích

```bash
cd path/to/your-project
git status
```

Không sử dụng đường dẫn của máy phát triển GCTG. Thay `path/to/your-project` bằng repository bạn thực sự muốn phân tích.

### 4. Kiểm tra repository

```bash
gctg status
```

### 5. Mở GUI

```bash
gctg serve 3717
```

Mở địa chỉ local được in trong terminal.

### 6. Phân tích một commit

Chọn commit trong GUI và lần lượt kiểm tra:

- Changed
- Affected
- Test Impact
- Review Execution

## GCTG làm gì?

GCTG giúp nối chuỗi:

`Git commit → code thay đổi → code bị ảnh hưởng → tests liên quan → execution plan`

GCTG không thay thế Git, test framework, CI hoặc runtime coverage.

## Khi gặp lỗi

Xem [Troubleshooting](TROUBLESHOOTING-0.9.6.md) hoặc đối chiếu với [bản tiếng Anh](GETTING-STARTED.md).
