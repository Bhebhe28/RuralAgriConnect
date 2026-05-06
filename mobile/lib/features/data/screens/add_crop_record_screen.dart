import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../providers/farm_data_provider.dart';
import '../../../core/theme/app_theme.dart';

class AddCropRecordScreen extends StatefulWidget {
  const AddCropRecordScreen({super.key});

  @override
  State<AddCropRecordScreen> createState() => _AddCropRecordScreenState();
}

class _AddCropRecordScreenState extends State<AddCropRecordScreen> {
  final _formKey = GlobalKey<FormState>();
  final _cropNameController = TextEditingController();
  final _varietyController = TextEditingController();
  final _notesController = TextEditingController();

  String? _selectedFieldId;
  DateTime? _plantedDate;
  DateTime? _harvestDate;
  bool _isSaving = false;

  static const List<String> _commonCrops = [
    'Maize',
    'Wheat',
    'Sorghum',
    'Sunflower',
    'Groundnut',
    'Soybean',
    'Cotton',
    'Tomato',
    'Potato',
    'Cabbage',
    'Onion',
    'Spinach',
    'Other',
  ];

  @override
  void dispose() {
    _cropNameController.dispose();
    _varietyController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _pickDate(bool isPlanted) async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now(),
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) {
      setState(() {
        if (isPlanted) {
          _plantedDate = picked;
        } else {
          _harvestDate = picked;
        }
      });
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    final data = context.read<FarmDataProvider>();
    final success = await data.addCropRecord(
      fieldId: _selectedFieldId!,
      cropName: _cropNameController.text.trim(),
      variety: _varietyController.text.trim().isEmpty
          ? null
          : _varietyController.text.trim(),
      plantedDate: _plantedDate,
      harvestDate: _harvestDate,
      notes: _notesController.text.trim().isEmpty
          ? null
          : _notesController.text.trim(),
    );

    if (mounted) {
      setState(() => _isSaving = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Crop record saved successfully'),
            backgroundColor: AppTheme.primaryGreen,
          ),
        );
        context.pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(data.errorMessage ?? 'Failed to save record'),
            backgroundColor: AppTheme.errorRed,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final data = context.watch<FarmDataProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Crop Record'),
        leading: IconButton(
          icon: const Icon(Icons.close),
          onPressed: () => context.pop(),
        ),
        actions: [
          if (_isSaving)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SpinKitThreeBounce(color: Colors.white, size: 20),
            )
          else
            TextButton(
              onPressed: _save,
              child: const Text('Save', style: TextStyle(color: Colors.white)),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Farm field selector
              DropdownButtonFormField<String>(
                value: _selectedFieldId,
                decoration: const InputDecoration(
                  labelText: 'Farm field *',
                  prefixIcon: Icon(Icons.landscape),
                ),
                items: data.fields
                    .map((f) => DropdownMenuItem(
                          value: f.id,
                          child: Text(f.name),
                        ))
                    .toList(),
                onChanged: (v) => setState(() => _selectedFieldId = v),
                validator: (v) =>
                    v == null ? 'Please select a farm field' : null,
              ),
              const SizedBox(height: 16),

              // Crop name (autocomplete from common crops)
              Autocomplete<String>(
                optionsBuilder: (textEditingValue) {
                  if (textEditingValue.text.isEmpty) return _commonCrops;
                  return _commonCrops.where((c) => c
                      .toLowerCase()
                      .contains(textEditingValue.text.toLowerCase()));
                },
                onSelected: (selection) {
                  _cropNameController.text = selection;
                },
                fieldViewBuilder: (context, controller, focusNode, onSubmit) {
                  // Sync with our controller
                  controller.text = _cropNameController.text;
                  return TextFormField(
                    controller: controller,
                    focusNode: focusNode,
                    textCapitalization: TextCapitalization.words,
                    textInputAction: TextInputAction.next,
                    decoration: const InputDecoration(
                      labelText: 'Crop name *',
                      hintText: 'e.g. Maize, Wheat, Tomato',
                      prefixIcon: Icon(Icons.grass),
                    ),
                    onChanged: (v) => _cropNameController.text = v,
                    validator: (v) {
                      if (v == null || v.trim().isEmpty) {
                        return 'Crop name is required';
                      }
                      return null;
                    },
                  );
                },
              ),
              const SizedBox(height: 16),

              // Variety
              TextFormField(
                controller: _varietyController,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Variety (optional)',
                  hintText: 'e.g. SC403, PAN 4R-728BR',
                  prefixIcon: Icon(Icons.category_outlined),
                ),
              ),
              const SizedBox(height: 16),

              // Planted date
              _DatePickerField(
                label: 'Planting date (optional)',
                date: _plantedDate,
                icon: Icons.calendar_today,
                onTap: () => _pickDate(true),
                onClear: () => setState(() => _plantedDate = null),
              ),
              const SizedBox(height: 16),

              // Expected harvest date
              _DatePickerField(
                label: 'Expected harvest date (optional)',
                date: _harvestDate,
                icon: Icons.event_available,
                onTap: () => _pickDate(false),
                onClear: () => setState(() => _harvestDate = null),
              ),
              const SizedBox(height: 16),

              // Notes
              TextFormField(
                controller: _notesController,
                maxLines: 3,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Notes (optional)',
                  hintText: 'Any additional observations...',
                  prefixIcon: Icon(Icons.notes),
                  alignLabelWithHint: true,
                ),
              ),
              const SizedBox(height: 40),

              ElevatedButton.icon(
                onPressed: _isSaving ? null : _save,
                icon: const Icon(Icons.save_outlined),
                label: const Text('Save Crop Record'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DatePickerField extends StatelessWidget {
  final String label;
  final DateTime? date;
  final IconData icon;
  final VoidCallback onTap;
  final VoidCallback onClear;

  const _DatePickerField({
    required this.label,
    required this.date,
    required this.icon,
    required this.onTap,
    required this.onClear,
  });

  String _formatDate(DateTime d) => '${d.day}/${d.month}/${d.year}';

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon),
          suffixIcon: date != null
              ? IconButton(
                  icon: const Icon(Icons.clear, size: 18),
                  onPressed: onClear,
                )
              : const Icon(Icons.arrow_drop_down),
        ),
        child: Text(
          date != null ? _formatDate(date!) : 'Tap to select',
          style: TextStyle(
            color: date != null ? null : Theme.of(context).colorScheme.onSurfaceVariant,
          ),
        ),
      ),
    );
  }
}
