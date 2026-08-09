// main.dart
// App học từ vựng tiếng Anh B1 kiểu flashcard - 25 cấp độ, mỗi cấp 25 câu, 2 điểm/câu (tối đa 50đ/cấp)
// Cần đạt tối thiểu 30/50 điểm để mở khóa cấp tiếp theo

import 'dart:math';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'levels_data.dart';

const int passScore = 30; // điểm tối thiểu để mở khóa cấp sau
const int pointsPerQuestion = 2;
const int maxScorePerLevel = 50; // 25 câu x 2 điểm

void main() {
  runApp(const EnglishApp());
}

class EnglishApp extends StatelessWidget {
  const EnglishApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Học tiếng Anh B1',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.light,
        primarySwatch: Colors.green,
        scaffoldBackgroundColor: const Color(0xFFF7F7F7),
        fontFamily: 'Roboto',
      ),
      home: const LevelMapScreen(),
    );
  }
}

// Quản lý lưu trữ điểm & mở khóa cấp độ bằng SharedPreferences
class ProgressStore {
  static Future<Map<int, int>> loadScores() async {
    final prefs = await SharedPreferences.getInstance();
    final Map<int, int> scores = {};
    for (final level in allLevels) {
      scores[level.id] = prefs.getInt('level_score_${level.id}') ?? 0;
    }
    return scores;
  }

  static Future<void> saveScore(int levelId, int score) async {
    final prefs = await SharedPreferences.getInstance();
    final current = prefs.getInt('level_score_$levelId') ?? 0;
    if (score > current) {
      await prefs.setInt('level_score_$levelId', score);
    }
  }
}

// Màn hình bản đồ 25 cấp độ
class LevelMapScreen extends StatefulWidget {
  const LevelMapScreen({super.key});

  @override
  State<LevelMapScreen> createState() => _LevelMapScreenState();
}

class _LevelMapScreenState extends State<LevelMapScreen> {
  Map<int, int> scores = {};
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _loadProgress();
  }

  Future<void> _loadProgress() async {
    final loaded = await ProgressStore.loadScores();
    setState(() {
      scores = loaded;
      loading = false;
    });
  }

  bool _isUnlocked(int levelId) {
    if (levelId == 1) return true;
    final prevScore = scores[levelId - 1] ?? 0;
    return prevScore >= passScore;
  }

  int get totalXp => scores.values.fold(0, (a, b) => a + b);

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Học từ vựng tiếng Anh B1'),
        backgroundColor: Colors.green,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Row(
                children: [
                  const Icon(Icons.star, color: Colors.amber),
                  const SizedBox(width: 4),
                  Text('$totalXp XP',
                      style: const TextStyle(
                          color: Colors.white, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: allLevels.length,
        itemBuilder: (context, index) {
          final level = allLevels[index];
          final unlocked = _isUnlocked(level.id);
          final score = scores[level.id] ?? 0;
          final passed = score >= passScore;

          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            elevation: unlocked ? 3 : 0,
            color: unlocked ? Colors.white : Colors.grey.shade200,
            child: ListTile(
              contentPadding: const EdgeInsets.all(12),
              leading: CircleAvatar(
                radius: 24,
                backgroundColor: passed
                    ? Colors.green
                    : (unlocked ? Colors.orange : Colors.grey),
                child: unlocked
                    ? Text('${level.id}',
                        style: const TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold))
                    : const Icon(Icons.lock, color: Colors.white, size: 20),
              ),
              title: Text(
                'Cấp ${level.id}: ${level.title}',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  color: unlocked ? Colors.black87 : Colors.grey,
                ),
              ),
              subtitle: unlocked
                  ? Text('Điểm cao nhất: $score / $maxScorePerLevel'
                      '${passed ? "  ✅ Đã qua" : ""}')
                  : const Text('Hoàn thành cấp trước (tối thiểu 30đ) để mở khóa'),
              trailing: unlocked
                  ? const Icon(Icons.chevron_right, color: Colors.green)
                  : null,
              onTap: unlocked
                  ? () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => QuizScreen(level: level),
                        ),
                      );
                      _loadProgress();
                    }
                  : null,
            ),
          );
        },
      ),
    );
  }
}

// Câu hỏi trắc nghiệm được tạo từ 1 WordItem + 3 đáp án nhiễu lấy từ cùng cấp độ
class QuizQuestion {
  final String word;
  final String correctMeaning;
  final List<String> options;

  QuizQuestion({
    required this.word,
    required this.correctMeaning,
    required this.options,
  });
}

class QuizScreen extends StatefulWidget {
  final LevelInfo level;
  const QuizScreen({super.key, required this.level});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  late List<QuizQuestion> questions;
  int currentIndex = 0;
  int score = 0;
  int? selectedOptionIndex;
  bool answered = false;
  bool finished = false;

  @override
  void initState() {
    super.initState();
    _generateQuestions();
  }

  void _generateQuestions() {
    final rand = Random();
    final words = List<WordItem>.from(widget.level.words);
    final allMeanings = words.map((w) => w.meaning).toList();

    final List<QuizQuestion> generated = [];
    for (final w in words) {
      final distractorPool = allMeanings.where((m) => m != w.meaning).toList()
        ..shuffle(rand);
      final distractors = distractorPool.take(3).toList();
      final options = [w.meaning, ...distractors]..shuffle(rand);
      generated.add(QuizQuestion(
        word: w.word,
        correctMeaning: w.meaning,
        options: options,
      ));
    }
    generated.shuffle(rand);
    setState(() {
      questions = generated;
    });
  }

  void _selectOption(int optionIndex) {
    if (answered) return;
    final question = questions[currentIndex];
    final isCorrect = question.options[optionIndex] == question.correctMeaning;

    setState(() {
      selectedOptionIndex = optionIndex;
      answered = true;
      if (isCorrect) {
        score += pointsPerQuestion;
      }
    });
  }

  void _nextQuestion() async {
    if (currentIndex < questions.length - 1) {
      setState(() {
        currentIndex++;
        selectedOptionIndex = null;
        answered = false;
      });
    } else {
      await ProgressStore.saveScore(widget.level.id, score);
      setState(() {
        finished = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (finished) {
      return _buildResultScreen();
    }

    if (questions.isEmpty) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final question = questions[currentIndex];

    return Scaffold(
      appBar: AppBar(
        title: Text('Cấp ${widget.level.id}: ${widget.level.title}'),
        backgroundColor: Colors.green,
      ),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            LinearProgressIndicator(
              value: (currentIndex + 1) / questions.length,
              backgroundColor: Colors.grey.shade300,
              color: Colors.green,
              minHeight: 8,
            ),
            const SizedBox(height: 8),
            Text(
              'Câu ${currentIndex + 1} / ${questions.length}   •   Điểm: $score',
              style: const TextStyle(color: Colors.grey),
            ),
            const SizedBox(height: 24),
            Card(
              elevation: 4,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 16),
                child: Column(
                  children: [
                    const Text(
                      'Từ này nghĩa là gì?',
                      style: TextStyle(color: Colors.grey, fontSize: 14),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      question.word,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),
            ...List.generate(question.options.length, (i) {
              final optionText = question.options[i];
              final isSelected = selectedOptionIndex == i;
              final isCorrectOption = optionText == question.correctMeaning;

              Color? bgColor;
              Color? borderColor = Colors.grey.shade300;
              if (answered) {
                if (isCorrectOption) {
                  bgColor = Colors.green.shade100;
                  borderColor = Colors.green;
                } else if (isSelected && !isCorrectOption) {
                  bgColor = Colors.red.shade100;
                  borderColor = Colors.red;
                }
              }

              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: InkWell(
                  onTap: () => _selectOption(i),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                    decoration: BoxDecoration(
                      color: bgColor ?? Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: borderColor ?? Colors.grey.shade300, width: 2),
                    ),
                    child: Text(optionText, style: const TextStyle(fontSize: 16)),
                  ),
                ),
              );
            }),
            const Spacer(),
            if (answered)
              ElevatedButton(
                onPressed: _nextQuestion,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: Text(
                  currentIndex < questions.length - 1 ? 'Câu tiếp theo' : 'Xem kết quả',
                  style: const TextStyle(fontSize: 16, color: Colors.white),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultScreen() {
    final passed = score >= passScore;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kết quả'),
        backgroundColor: Colors.green,
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                passed ? Icons.emoji_events : Icons.refresh,
                size: 90,
                color: passed ? Colors.amber : Colors.orange,
              ),
              const SizedBox(height: 20),
              Text(
                passed ? 'Hoàn thành cấp độ!' : 'Chưa đạt, thử lại nhé!',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),
              Text(
                '$score / $maxScorePerLevel điểm',
                style: const TextStyle(fontSize: 20, color: Colors.grey),
              ),
              const SizedBox(height: 8),
              Text(
                passed
                    ? 'Bạn đã mở khóa cấp tiếp theo!'
                    : 'Cần tối thiểu $passScore điểm để mở khóa cấp tiếp theo.',
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        setState(() {
                          currentIndex = 0;
                          score = 0;
                          selectedOptionIndex = null;
                          answered = false;
                          finished = false;
                          _generateQuestions();
                        });
                      },
                      child: const Text('Làm lại'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Về bản đồ', style: TextStyle(color: Colors.white)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
