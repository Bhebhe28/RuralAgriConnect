import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/farm_data_provider.dart';
import '../models/crop_record.dart';
import '../../../core/router/app_router.dart';
import '../../../core/theme/app_theme.dart';

class CropRecordListScreen extends StatelessWidget {
  const CropRecordListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final data = context.watch<FarmDataProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Crop Records'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.pop(),
        ),
      ),
      floatingActionButton: data.fields.isEmpty
          ? null
          : FloatingActionButton.extended(
              onPressed: () => context.push(AppRouter.addCropRecord),
              backgroundColor: AppTheme.primaryGreen,
              icon: const Icon(Icons.add, color: Colors.white),
              label: const Text('Add Record', style: TextStyle(color: Colors.white)),
            ),
      body: data.isLoading
          ? const Center(child: CircularProgressIndicator())
          : data.fields.isEmpty
              ? _NoFieldsState()
              : data.cropRecords.isEmpty
                  ? _EmptyState(onAdd: () => context.push(AppRouter.addCropRecord))
                  : RefreshIndicator(
                      onRefresh: () => data.loadCropRecords(),
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 100),
                        itemCount: data.cropRecords.length,
                        itemBuilder: (context, index) {
                          final record = data.cropRecords[index];
                          final field = data.fields
                              .where((f) => f.id == record.fieldId)
                              .firstOrNull;
                          return _CropCard(
                            record: record,
                            fieldName: field?.name ?? 'Unknown field',
                            onDelete: () =>
                                _confirmDelete(context, data, record),
                          );
                        },
                      ),
                    ),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    FarmDataProvider data,
    CropRecord record,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete record?'),
        content: Text('Delete "${record.cropName}" record?'),
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
      await data.deleteCropRecord(record.id);
    }
  }
}

class _CropCard extends StatelessWidget {
  final CropRecord record;
  final String fieldName;
  final VoidCallback onDelete;

  const _CropCard({
    required this.record,
    required this.fieldName,
    required this.onDelete,
  });

  Color get _statusColor {
    switch (record.status) {
      case CropStatus.active:
        return AppTheme.primaryGreen;
      case CropStatus.harvested:
        return AppTheme.accentAmber;
      case CropStatus.failed:
        return AppTheme.errorRed;
    }
  }

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
                    color: _statusColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(Icons.grass, color: _statusColor),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        record.cropName,
                        style: const TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                        ),
                      ),
                      if (record.variety != null)
                        Text(
                          record.variety!,
                          style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 13),
                        ),
                    ],
                  ),
                ),
                PopupMenuButton<String>(
                  onSelected: (v) {
                    if (v == 'delete') onDelete();
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
              runSpacing: 4,
              children: [
                _StatusBadge(status: record.status),
                _InfoChip(icon: Icons.landscape, label: fieldName),
                if (record.plantedDate != null)
                  _InfoChip(
                    icon: Icons.calendar_today,
                    label: _formatDate(record.plantedDate!),
                  ),
              ],
            ),
            if (record.notes != null && record.notes!.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                record.notes!,
                style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, fontSize: 13),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}

class _StatusBadge extends StatelessWidget {
  final CropStatus status;

  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (status) {
      case CropStatus.active:
        color = AppTheme.primaryGreen;
        label = 'Active';
        break;
      case CropStatus.harvested:
        color = AppTheme.accentAmber;
        label = 'Harvested';
        break;
      case CropStatus.failed:
        color = AppTheme.errorRed;
        label = 'Failed';
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(width: 4),
          Text(label, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
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
            Icon(Icons.eco_outlined, size: 80, color: Theme.of(context).colorScheme.outlineVariant),
            const SizedBox(height: 16),
            Text(
              'No crop records yet',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Start tracking your crops by adding a record',
              textAlign: TextAlign.center,
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: onAdd,
              icon: const Icon(Icons.add),
              label: const Text('Add Crop Record'),
            ),
          ],
        ),
      ),
    );
  }
}

class _NoFieldsState extends StatelessWidget {
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
              'Add a farm field first',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    color: Theme.of(context).colorScheme.onSurfaceVariant,
                  ),
            ),
            const SizedBox(height: 8),
            Text(
              'Crop records must be linked to a farm field',
              textAlign: TextAlign.center,
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => context.push(AppRouter.farmFields),
              icon: const Icon(Icons.add),
              label: const Text('Add Farm Field'),
            ),
          ],
        ),
      ),
    );
  }
}
