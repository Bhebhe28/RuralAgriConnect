import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../providers/farm_data_provider.dart';
import '../../../core/theme/app_theme.dart';

class AddFarmFieldScreen extends StatefulWidget {
  const AddFarmFieldScreen({super.key});

  @override
  State<AddFarmFieldScreen> createState() => _AddFarmFieldScreenState();
}

class _AddFarmFieldScreenState extends State<AddFarmFieldScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _locationController = TextEditingController();
  final _areaController = TextEditingController();
  String? _selectedSoilType;
  bool _isSaving = false;

  static const List<String> _soilTypes = [
    'Sandy',
    'Clay',
    'Loam',
    'Sandy Loam',
    'Clay Loam',
    'Silt',
    'Peat',
    'Chalky',
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _locationController.dispose();
    _areaController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);

    final data = context.read<FarmDataProvider>();
    final success = await data.addField(
      name: _nameController.text.trim(),
      location: _locationController.text.trim().isEmpty
          ? null
          : _locationController.text.trim(),
      areaHa: _areaController.text.trim().isEmpty
          ? null
          : double.tryParse(_areaController.text.trim()),
      soilType: _selectedSoilType,
    );

    if (mounted) {
      setState(() => _isSaving = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Farm field saved successfully'),
            backgroundColor: AppTheme.primaryGreen,
          ),
        );
        context.pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(data.errorMessage ?? 'Failed to save field'),
            backgroundColor: AppTheme.errorRed,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Farm Field'),
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
              // Field name
              TextFormField(
                controller: _nameController,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Field name *',
                  hintText: 'e.g. North Maize Field',
                  prefixIcon: Icon(Icons.landscape),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Field name is required';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Location
              TextFormField(
                controller: _locationController,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Location (optional)',
                  hintText: 'e.g. GPS coordinates or village name',
                  prefixIcon: Icon(Icons.location_on_outlined),
                ),
              ),
              const SizedBox(height: 16),

              // Area
              TextFormField(
                controller: _areaController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Area (hectares, optional)',
                  hintText: 'e.g. 2.5',
                  prefixIcon: Icon(Icons.straighten),
                  suffixText: 'ha',
                ),
                validator: (v) {
                  if (v != null && v.isNotEmpty) {
                    final parsed = double.tryParse(v);
                    if (parsed == null || parsed <= 0) {
                      return 'Enter a valid area in hectares';
                    }
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Soil type
              DropdownButtonFormField<String>(
                value: _selectedSoilType,
                decoration: const InputDecoration(
                  labelText: 'Soil type (optional)',
                  prefixIcon: Icon(Icons.terrain),
                ),
                items: _soilTypes
                    .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                    .toList(),
                onChanged: (v) => setState(() => _selectedSoilType = v),
              ),
              const SizedBox(height: 40),

              ElevatedButton.icon(
                onPressed: _isSaving ? null : _save,
                icon: const Icon(Icons.save_outlined),
                label: const Text('Save Farm Field'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
