import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/farm_data_provider.dart';
import '../models/farm_field.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_theme.dart';

class FarmFieldListScreen extends StatelessWidget {
  const FarmFieldListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final data = context.watch<FarmDataProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Farm Fields'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(AppRouter.addFarmField),
        backgroundColor: AppTheme.primaryGreen,
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Add Field', style: TextStyle(color: Colors.white)),
      ),
      body: data.isLoading
          ? const Center(child: CircularProgressIndicator())
          : data.fields.isEmpty
              ? _EmptyState(onAdd: () => context.push(AppRouter.addFarmField))
              : RefreshIndicator(
                  onRefresh: () => data.loadFields(),
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                    itemCount: data.fields.length,
                    itemBuilder: (context, index) {
                      return _FieldCard(
                        field: data.fields[index],
                        cropCount: data
                            .getCropRecordsForField(data.fields[index].id)
                            .length,
                        onDelete: () => _confirmDelete(
                          context,
                          data,
                          data.fields[index],
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    FarmDataProvider data,
    FarmField field,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete field?'),
        content: Text(
          'Delete "${field.name}"? This will also remove all associated crop records.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorRed),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await data.deleteField(field.id);
    }
  }
}

class _FieldCard extends StatelessWidget {
  final FarmField field;
  final int cropCount;
  final VoidCallback onDelete;

  const _FieldCard({
    required this.field,
    required this.cropCount,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppTheme.primaryGreen.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.landscape, color: AppTheme.primaryGreen),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        field.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                      if (field.location != null)
                        Text(
                          field.location!,
                          style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 13),
                        ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'delete') onDelete();
                  },
                  itemBuilder: (_) => [
                    const PopupMenuItem(
                      value: 'delete',
                      child: Row(
                        children: [
                          Icon(Icons.delete_outline, color: AppTheme.errorRed),
                          SizedBox(width: 8),
                          Text('Delete', style: TextStyle(color: AppTheme.errorRed)),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              children: [
                if (field.areaHa != null)
                  _Chip(
                    icon: Icons.straighten,
                    label: '${field.areaHa!.toStringAsFixed(1)} ha',
                  ),
                if (field.soilType != null)
                  _Chip(icon: Icons.terrain, label: field.soilType!),
                _Chip(
                  icon: Icons.grass,
                  label: '$cropCount crop${cropCount == 1 ? '' : 's'}',
                ),
                if (!field.isSynced)
                  const _Chip(
                    icon: Icons.cloud_off,
                    label: 'Local only',
                    color: AppTheme.accentAmber,
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;

  const _Chip({required this.icon, required this.label, this.color});

  @override
  Widget build(BuildContext context) {
    final c = color ?? AppTheme.primaryGreen;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: c.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: c),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 12, color: c)),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onAdd;

  const _EmptyState({required this.onAdd});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.landscape_outlined, size: 80, color: Theme.of(context).colorScheme.outlineVariant),
            const SizedBox(height: 16),
            Text(
              'No farm fields yet',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Add your first field to start tracking crops',
              textAlign: TextAlign.center,
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add),
              label: const Text('Add Farm Field'),
            ),
          ],
        ),
      ),
    );
  }
}
