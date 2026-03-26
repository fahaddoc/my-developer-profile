# 💰 Expense Tracker App

> A modern expense tracking application built with Flutter using Clean Architecture principles.

![Flutter](https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white)
![Dart](https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white)
![Clean Architecture](https://img.shields.io/badge/Clean_Architecture-FF6B6B?style=for-the-badge)

---

## 📱 Overview

Expense Tracker is a feature-rich mobile application that helps users manage their daily expenses, set budgets, and visualize spending patterns. Built with **Clean Architecture** to ensure scalability, testability, and maintainability.

### Key Features

- ✅ Add, edit, delete expenses
- ✅ Categorize expenses (Food, Transport, Shopping, Bills, etc.)
- ✅ Monthly/Weekly/Daily expense summaries
- ✅ Beautiful charts & analytics
- ✅ Budget setting with alerts
- ✅ Export data to CSV/PDF
- ✅ Dark/Light theme support
- ✅ Local storage with SQLite/Floor
- ✅ Search & filter expenses

---

## 🏗️ Architecture Overview

This project follows **Clean Architecture** by Robert C. Martin (Uncle Bob). The architecture separates concerns into distinct layers, making the codebase:

- **Testable** - Each layer can be tested independently
- **Maintainable** - Changes in one layer don't affect others
- **Scalable** - Easy to add new features
- **Framework Independent** - Business logic doesn't depend on Flutter

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Screens   │  │   Widgets   │  │   BLoC / Provider   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        DOMAIN LAYER                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Entities   │  │  Use Cases  │  │ Repository Interface│  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         DATA LAYER                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Models    │  │ Data Sources│  │ Repository Implement│  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
lib/
├── core/                          # Core utilities & shared code
│   ├── constants/
│   │   ├── app_colors.dart
│   │   ├── app_strings.dart
│   │   └── app_constants.dart
│   ├── errors/
│   │   ├── exceptions.dart
│   │   └── failures.dart
│   ├── usecases/
│   │   └── usecase.dart           # Base UseCase class
│   ├── utils/
│   │   ├── date_utils.dart
│   │   ├── currency_formatter.dart
│   │   └── validators.dart
│   └── themes/
│       ├── app_theme.dart
│       └── dark_theme.dart
│
├── features/                       # Feature modules
│   ├── expense/                    # Expense feature
│   │   ├── data/
│   │   │   ├── datasources/
│   │   │   │   ├── expense_local_datasource.dart
│   │   │   │   └── expense_remote_datasource.dart
│   │   │   ├── models/
│   │   │   │   └── expense_model.dart
│   │   │   └── repositories/
│   │   │       └── expense_repository_impl.dart
│   │   │
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── expense.dart
│   │   │   ├── repositories/
│   │   │   │   └── expense_repository.dart
│   │   │   └── usecases/
│   │   │       ├── add_expense.dart
│   │   │       ├── get_expenses.dart
│   │   │       ├── update_expense.dart
│   │   │       ├── delete_expense.dart
│   │   │       └── get_expenses_by_category.dart
│   │   │
│   │   └── presentation/
│   │       ├── bloc/
│   │       │   ├── expense_bloc.dart
│   │       │   ├── expense_event.dart
│   │       │   └── expense_state.dart
│   │       ├── pages/
│   │       │   ├── expense_list_page.dart
│   │       │   ├── add_expense_page.dart
│   │       │   └── expense_detail_page.dart
│   │       └── widgets/
│   │           ├── expense_card.dart
│   │           ├── category_chip.dart
│   │           └── expense_form.dart
│   │
│   ├── category/                   # Category feature
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   │
│   ├── budget/                     # Budget feature
│   │   ├── data/
│   │   ├── domain/
│   │   └── presentation/
│   │
│   └── analytics/                  # Analytics feature
│       ├── data/
│       ├── domain/
│       └── presentation/
│
├── injection_container.dart        # Dependency Injection setup
└── main.dart                       # App entry point
```

---

## 🔍 Layer Details

### 1. Domain Layer (Business Logic)

**Yeh layer sabse important hai - ismein pure business rules hain.**

#### Entities (Pure Dart Classes)
```dart
// lib/features/expense/domain/entities/expense.dart

class Expense {
  final String id;
  final String title;
  final double amount;
  final DateTime date;
  final ExpenseCategory category;
  final String? note;

  const Expense({
    required this.id,
    required this.title,
    required this.amount,
    required this.date,
    required this.category,
    this.note,
  });
}

enum ExpenseCategory {
  food,
  transport,
  shopping,
  bills,
  entertainment,
  health,
  education,
  other,
}
```

#### Repository Interface (Contract)
```dart
// lib/features/expense/domain/repositories/expense_repository.dart

import 'package:dartz/dartz.dart';

abstract class ExpenseRepository {
  Future<Either<Failure, List<Expense>>> getExpenses();
  Future<Either<Failure, Expense>> getExpenseById(String id);
  Future<Either<Failure, void>> addExpense(Expense expense);
  Future<Either<Failure, void>> updateExpense(Expense expense);
  Future<Either<Failure, void>> deleteExpense(String id);
  Future<Either<Failure, List<Expense>>> getExpensesByCategory(ExpenseCategory category);
  Future<Either<Failure, List<Expense>>> getExpensesByDateRange(DateTime start, DateTime end);
}
```

#### Use Cases (Application Business Rules)
```dart
// lib/features/expense/domain/usecases/add_expense.dart

import 'package:dartz/dartz.dart';

class AddExpense implements UseCase<void, AddExpenseParams> {
  final ExpenseRepository repository;

  AddExpense(this.repository);

  @override
  Future<Either<Failure, void>> call(AddExpenseParams params) async {
    // Business validation
    if (params.amount <= 0) {
      return Left(ValidationFailure('Amount must be greater than 0'));
    }

    if (params.title.isEmpty) {
      return Left(ValidationFailure('Title cannot be empty'));
    }

    final expense = Expense(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: params.title,
      amount: params.amount,
      date: params.date,
      category: params.category,
      note: params.note,
    );

    return await repository.addExpense(expense);
  }
}

class AddExpenseParams {
  final String title;
  final double amount;
  final DateTime date;
  final ExpenseCategory category;
  final String? note;

  AddExpenseParams({
    required this.title,
    required this.amount,
    required this.date,
    required this.category,
    this.note,
  });
}
```

---

### 2. Data Layer (Data Handling)

**Yeh layer external sources se data fetch/store karti hai.**

#### Models (Data Transfer Objects)
```dart
// lib/features/expense/data/models/expense_model.dart

import 'package:floor/floor.dart';

@Entity(tableName: 'expenses')
class ExpenseModel {
  @PrimaryKey()
  final String id;
  final String title;
  final double amount;
  final int dateTimestamp;
  final String category;
  final String? note;

  ExpenseModel({
    required this.id,
    required this.title,
    required this.amount,
    required this.dateTimestamp,
    required this.category,
    this.note,
  });

  // Convert from Entity to Model
  factory ExpenseModel.fromEntity(Expense expense) {
    return ExpenseModel(
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      dateTimestamp: expense.date.millisecondsSinceEpoch,
      category: expense.category.name,
      note: expense.note,
    );
  }

  // Convert from Model to Entity
  Expense toEntity() {
    return Expense(
      id: id,
      title: title,
      amount: amount,
      date: DateTime.fromMillisecondsSinceEpoch(dateTimestamp),
      category: ExpenseCategory.values.firstWhere((e) => e.name == category),
      note: note,
    );
  }

  // JSON serialization
  factory ExpenseModel.fromJson(Map<String, dynamic> json) {
    return ExpenseModel(
      id: json['id'],
      title: json['title'],
      amount: json['amount'].toDouble(),
      dateTimestamp: json['date'],
      category: json['category'],
      note: json['note'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'amount': amount,
      'date': dateTimestamp,
      'category': category,
      'note': note,
    };
  }
}
```

#### Data Source (Database Access)
```dart
// lib/features/expense/data/datasources/expense_local_datasource.dart

@dao
abstract class ExpenseDao {
  @Query('SELECT * FROM expenses ORDER BY dateTimestamp DESC')
  Future<List<ExpenseModel>> getAllExpenses();

  @Query('SELECT * FROM expenses WHERE id = :id')
  Future<ExpenseModel?> getExpenseById(String id);

  @Query('SELECT * FROM expenses WHERE category = :category')
  Future<List<ExpenseModel>> getExpensesByCategory(String category);

  @Query('SELECT * FROM expenses WHERE dateTimestamp BETWEEN :start AND :end')
  Future<List<ExpenseModel>> getExpensesByDateRange(int start, int end);

  @insert
  Future<void> insertExpense(ExpenseModel expense);

  @update
  Future<void> updateExpense(ExpenseModel expense);

  @Query('DELETE FROM expenses WHERE id = :id')
  Future<void> deleteExpense(String id);

  @Query('SELECT SUM(amount) FROM expenses WHERE category = :category')
  Future<double?> getTotalByCategory(String category);

  @Query('SELECT SUM(amount) FROM expenses WHERE dateTimestamp BETWEEN :start AND :end')
  Future<double?> getTotalByDateRange(int start, int end);
}
```

#### Repository Implementation
```dart
// lib/features/expense/data/repositories/expense_repository_impl.dart

class ExpenseRepositoryImpl implements ExpenseRepository {
  final ExpenseDao localDataSource;

  ExpenseRepositoryImpl({required this.localDataSource});

  @override
  Future<Either<Failure, List<Expense>>> getExpenses() async {
    try {
      final models = await localDataSource.getAllExpenses();
      final expenses = models.map((model) => model.toEntity()).toList();
      return Right(expenses);
    } on DatabaseException catch (e) {
      return Left(DatabaseFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  @override
  Future<Either<Failure, void>> addExpense(Expense expense) async {
    try {
      final model = ExpenseModel.fromEntity(expense);
      await localDataSource.insertExpense(model);
      return const Right(null);
    } on DatabaseException catch (e) {
      return Left(DatabaseFailure(e.message));
    } catch (e) {
      return Left(UnexpectedFailure(e.toString()));
    }
  }

  // ... other methods
}
```

---

### 3. Presentation Layer (UI)

**Yeh layer user interface handle karti hai.**

#### BLoC (Business Logic Component)
```dart
// lib/features/expense/presentation/bloc/expense_bloc.dart

class ExpenseBloc extends Bloc<ExpenseEvent, ExpenseState> {
  final GetExpenses getExpenses;
  final AddExpense addExpense;
  final UpdateExpense updateExpense;
  final DeleteExpense deleteExpense;

  ExpenseBloc({
    required this.getExpenses,
    required this.addExpense,
    required this.updateExpense,
    required this.deleteExpense,
  }) : super(ExpenseInitial()) {
    on<LoadExpenses>(_onLoadExpenses);
    on<AddExpenseEvent>(_onAddExpense);
    on<UpdateExpenseEvent>(_onUpdateExpense);
    on<DeleteExpenseEvent>(_onDeleteExpense);
  }

  Future<void> _onLoadExpenses(
    LoadExpenses event,
    Emitter<ExpenseState> emit,
  ) async {
    emit(ExpenseLoading());

    final result = await getExpenses(NoParams());

    result.fold(
      (failure) => emit(ExpenseError(failure.message)),
      (expenses) => emit(ExpenseLoaded(expenses)),
    );
  }

  Future<void> _onAddExpense(
    AddExpenseEvent event,
    Emitter<ExpenseState> emit,
  ) async {
    emit(ExpenseLoading());

    final result = await addExpense(AddExpenseParams(
      title: event.title,
      amount: event.amount,
      date: event.date,
      category: event.category,
      note: event.note,
    ));

    result.fold(
      (failure) => emit(ExpenseError(failure.message)),
      (_) {
        emit(ExpenseAdded());
        add(LoadExpenses()); // Reload list
      },
    );
  }

  // ... other event handlers
}
```

#### Events & States
```dart
// lib/features/expense/presentation/bloc/expense_event.dart

abstract class ExpenseEvent {}

class LoadExpenses extends ExpenseEvent {}

class AddExpenseEvent extends ExpenseEvent {
  final String title;
  final double amount;
  final DateTime date;
  final ExpenseCategory category;
  final String? note;

  AddExpenseEvent({
    required this.title,
    required this.amount,
    required this.date,
    required this.category,
    this.note,
  });
}

class UpdateExpenseEvent extends ExpenseEvent {
  final Expense expense;
  UpdateExpenseEvent(this.expense);
}

class DeleteExpenseEvent extends ExpenseEvent {
  final String id;
  DeleteExpenseEvent(this.id);
}

// lib/features/expense/presentation/bloc/expense_state.dart

abstract class ExpenseState {}

class ExpenseInitial extends ExpenseState {}

class ExpenseLoading extends ExpenseState {}

class ExpenseLoaded extends ExpenseState {
  final List<Expense> expenses;
  final double totalAmount;

  ExpenseLoaded(this.expenses)
      : totalAmount = expenses.fold(0, (sum, e) => sum + e.amount);
}

class ExpenseAdded extends ExpenseState {}

class ExpenseUpdated extends ExpenseState {}

class ExpenseDeleted extends ExpenseState {}

class ExpenseError extends ExpenseState {
  final String message;
  ExpenseError(this.message);
}
```

#### UI Page
```dart
// lib/features/expense/presentation/pages/expense_list_page.dart

class ExpenseListPage extends StatelessWidget {
  const ExpenseListPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Expenses'),
        actions: [
          IconButton(
            icon: const Icon(Icons.filter_list),
            onPressed: () => _showFilterDialog(context),
          ),
        ],
      ),
      body: BlocBuilder<ExpenseBloc, ExpenseState>(
        builder: (context, state) {
          if (state is ExpenseLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ExpenseError) {
            return Center(child: Text(state.message));
          }

          if (state is ExpenseLoaded) {
            if (state.expenses.isEmpty) {
              return const EmptyStateWidget();
            }

            return Column(
              children: [
                // Summary Card
                TotalExpenseCard(total: state.totalAmount),

                // Expense List
                Expanded(
                  child: ListView.builder(
                    itemCount: state.expenses.length,
                    itemBuilder: (context, index) {
                      final expense = state.expenses[index];
                      return ExpenseCard(
                        expense: expense,
                        onTap: () => _goToDetail(context, expense),
                        onDelete: () => _deleteExpense(context, expense.id),
                      );
                    },
                  ),
                ),
              ],
            );
          }

          return const SizedBox.shrink();
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _goToAddExpense(context),
        icon: const Icon(Icons.add),
        label: const Text('Add Expense'),
      ),
    );
  }
}
```

---

## 💉 Dependency Injection

```dart
// lib/injection_container.dart

import 'package:get_it/get_it.dart';

final sl = GetIt.instance;

Future<void> init() async {
  //! Features - Expense

  // Bloc
  sl.registerFactory(
    () => ExpenseBloc(
      getExpenses: sl(),
      addExpense: sl(),
      updateExpense: sl(),
      deleteExpense: sl(),
    ),
  );

  // Use Cases
  sl.registerLazySingleton(() => GetExpenses(sl()));
  sl.registerLazySingleton(() => AddExpense(sl()));
  sl.registerLazySingleton(() => UpdateExpense(sl()));
  sl.registerLazySingleton(() => DeleteExpense(sl()));

  // Repository
  sl.registerLazySingleton<ExpenseRepository>(
    () => ExpenseRepositoryImpl(localDataSource: sl()),
  );

  // Data Sources
  sl.registerLazySingleton<ExpenseDao>(
    () => sl<AppDatabase>().expenseDao,
  );

  //! Core
  sl.registerLazySingleton(() => AppDatabase());
}
```

---

## 📦 Dependencies

```yaml
# pubspec.yaml

dependencies:
  flutter:
    sdk: flutter

  # State Management
  flutter_bloc: ^8.1.3

  # Dependency Injection
  get_it: ^7.6.0

  # Functional Programming
  dartz: ^0.10.1

  # Database
  floor: ^1.4.2
  sqflite: ^2.3.0

  # Charts
  fl_chart: ^0.65.0

  # Date Formatting
  intl: ^0.18.1

  # UI
  google_fonts: ^6.1.0
  flutter_slidable: ^3.0.1

dev_dependencies:
  flutter_test:
    sdk: flutter

  # Code Generation
  floor_generator: ^1.4.2
  build_runner: ^2.4.6

  # Testing
  bloc_test: ^9.1.4
  mocktail: ^1.0.1
```

---

## 🧪 Testing Strategy

### Unit Tests
```dart
// test/features/expense/domain/usecases/add_expense_test.dart

void main() {
  late AddExpense usecase;
  late MockExpenseRepository mockRepository;

  setUp(() {
    mockRepository = MockExpenseRepository();
    usecase = AddExpense(mockRepository);
  });

  test('should add expense when valid data is provided', () async {
    // Arrange
    when(() => mockRepository.addExpense(any()))
        .thenAnswer((_) async => const Right(null));

    // Act
    final result = await usecase(AddExpenseParams(
      title: 'Lunch',
      amount: 500,
      date: DateTime.now(),
      category: ExpenseCategory.food,
    ));

    // Assert
    expect(result, const Right(null));
    verify(() => mockRepository.addExpense(any())).called(1);
  });

  test('should return failure when amount is zero', () async {
    // Act
    final result = await usecase(AddExpenseParams(
      title: 'Test',
      amount: 0,
      date: DateTime.now(),
      category: ExpenseCategory.other,
    ));

    // Assert
    expect(result.isLeft(), true);
    verifyNever(() => mockRepository.addExpense(any()));
  });
}
```

---

## 🎯 Interview Questions & Answers

### Q1: Clean Architecture kya hai aur ismein kitni layers hain?

**Answer:** Clean Architecture ek software design principle hai jo Uncle Bob (Robert C. Martin) ne introduce ki. Ismein 3 main layers hain:

1. **Domain Layer** - Business logic, entities, use cases
2. **Data Layer** - Data sources, repositories implementation, models
3. **Presentation Layer** - UI, BLoC/Provider, widgets

**Key Point:** Inner layers outer layers ke baare mein kuch nahi jaanti. Dependency sirf inward flow hoti hai.

### Q2: Entity aur Model mein kya difference hai?

**Answer:**
- **Entity** - Pure Dart class, business logic represent karti hai, kisi framework pe depend nahi karti
- **Model** - Data layer mein use hoti hai, JSON serialization, database mapping ke methods hote hain

### Q3: Use Case kya hai?

**Answer:** Use Case ek single business action hai. Har use case sirf ek kaam karta hai (Single Responsibility). Example: `AddExpense`, `GetExpenses`, `DeleteExpense`. Yeh application-specific business rules contain karta hai.

### Q4: Repository Pattern kyun use kiya?

**Answer:** Repository Pattern data source ko abstract karta hai. Isse:
- Domain layer ko pata nahi data kahan se aa raha (SQLite, API, Firebase)
- Testing easy ho jati hai (mock repository bana sakte hain)
- Data source change karna asaan (SQLite se Firebase pe shift)

### Q5: Either<Failure, Success> kyun use kiya?

**Answer:** Functional programming approach hai. Exceptions throw karne ki jagah:
- `Left` - Error/Failure return karta hai
- `Right` - Success value return karta hai

Isse error handling explicit ho jati hai aur code predictable rehta hai.

---

## 📸 Screenshots

> Add your app screenshots here

| Home Screen | Add Expense | Analytics |
|-------------|-------------|-----------|
| Screenshot 1 | Screenshot 2 | Screenshot 3 |

---

## 🚀 Getting Started

```bash
# Clone repository
git clone https://github.com/fahaddoc600/expense-tracker.git

# Install dependencies
flutter pub get

# Generate floor database
flutter packages pub run build_runner build

# Run app
flutter run
```

---

## 👨‍💻 Author

**Shah Fahad**
- GitHub: [@fahaddoc600](https://github.com/fahaddoc600)
- LinkedIn: [fahaddoc600](https://linkedin.com/in/fahaddoc600)
- Email: fahaddoc600@gmail.com

---

## 📄 License

This project is licensed under the MIT License.
