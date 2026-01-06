#!/usr/bin/env python3
"""
Generate sample concentration-time plots for the Pharmascribe demo data.
Creates individual subject plots and a mean plot with SD error bars.
"""

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import numpy as np
import os

# Get the directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
sample_data_dir = os.path.join(project_root, 'public', 'sample-data')

# Read the concentration-time data
csv_path = os.path.join(sample_data_dir, 'theophylline_concentration_time.csv')
df = pd.read_csv(csv_path)

# Create output directory for figures
figures_dir = os.path.join(sample_data_dir, 'figures')
os.makedirs(figures_dir, exist_ok=True)

# Set style for publication-quality plots
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['font.family'] = 'serif'
plt.rcParams['font.serif'] = ['Times New Roman', 'DejaVu Serif', 'serif']
plt.rcParams['font.size'] = 10
plt.rcParams['axes.labelsize'] = 11
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['figure.dpi'] = 150

# Color palette for individual subjects
colors = plt.cm.tab10(np.linspace(0, 1, len(df['Subject_ID'].unique())))

# 1. Create individual concentration-time plot (all subjects)
fig, ax = plt.subplots(figsize=(8, 5))
subjects = df['Subject_ID'].unique()

for i, subject in enumerate(subjects):
    subject_data = df[df['Subject_ID'] == subject]
    ax.plot(subject_data['Time_h'], subject_data['Concentration_mg_L'],
            marker='o', markersize=4, linewidth=1.5,
            label=f'Subject {subject}', color=colors[i], alpha=0.8)

ax.set_xlabel('Time (hours)')
ax.set_ylabel('Theophylline Concentration (mg/L)')
ax.set_title('Individual Concentration-Time Profiles\nTheophylline 320 mg Oral Dose')
ax.legend(loc='upper right', fontsize=8, ncol=2)
ax.set_xlim(-0.5, 25)
ax.set_ylim(0, None)
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(figures_dir, 'individual_concentration_time.png'),
            dpi=150, bbox_inches='tight', facecolor='white')
plt.close()
print("Created: individual_concentration_time.png")

# 2. Create individual plots (linear scale - spaghetti plot)
fig, ax = plt.subplots(figsize=(8, 5))
for i, subject in enumerate(subjects):
    subject_data = df[df['Subject_ID'] == subject]
    ax.plot(subject_data['Time_h'], subject_data['Concentration_mg_L'],
            marker='o', markersize=3, linewidth=1, color='#2563eb', alpha=0.5)

ax.set_xlabel('Time (hours)')
ax.set_ylabel('Theophylline Concentration (mg/L)')
ax.set_title('Plasma Concentration-Time Profiles (Linear Scale)\nN=12 Subjects')
ax.set_xlim(-0.5, 25)
ax.set_ylim(0, None)
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(figures_dir, 'spaghetti_linear.png'),
            dpi=150, bbox_inches='tight', facecolor='white')
plt.close()
print("Created: spaghetti_linear.png")

# 3. Create individual plots (semi-log scale - spaghetti plot)
fig, ax = plt.subplots(figsize=(8, 5))
for i, subject in enumerate(subjects):
    subject_data = df[df['Subject_ID'] == subject]
    # Filter out zero concentrations for log scale
    data_nonzero = subject_data[subject_data['Concentration_mg_L'] > 0]
    ax.semilogy(data_nonzero['Time_h'], data_nonzero['Concentration_mg_L'],
                marker='o', markersize=3, linewidth=1, color='#2563eb', alpha=0.5)

ax.set_xlabel('Time (hours)')
ax.set_ylabel('Theophylline Concentration (mg/L)')
ax.set_title('Plasma Concentration-Time Profiles (Semi-Log Scale)\nN=12 Subjects')
ax.set_xlim(-0.5, 25)
ax.grid(True, alpha=0.3, which='both')
plt.tight_layout()
plt.savefig(os.path.join(figures_dir, 'spaghetti_semilog.png'),
            dpi=150, bbox_inches='tight', facecolor='white')
plt.close()
print("Created: spaghetti_semilog.png")

# 4. Create mean concentration-time plot with SD error bars
mean_data = df.groupby('Time_h')['Concentration_mg_L'].agg(['mean', 'std']).reset_index()

fig, ax = plt.subplots(figsize=(8, 5))
ax.errorbar(mean_data['Time_h'], mean_data['mean'], yerr=mean_data['std'],
            marker='s', markersize=6, linewidth=2, capsize=4, capthick=1.5,
            color='#dc2626', ecolor='#ef4444', label='Mean ± SD (N=12)')

ax.set_xlabel('Time (hours)')
ax.set_ylabel('Theophylline Concentration (mg/L)')
ax.set_title('Mean Plasma Concentration-Time Profile\nTheophylline 320 mg Oral Dose (N=12)')
ax.legend(loc='upper right')
ax.set_xlim(-0.5, 25)
ax.set_ylim(0, None)
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(figures_dir, 'mean_concentration_time.png'),
            dpi=150, bbox_inches='tight', facecolor='white')
plt.close()
print("Created: mean_concentration_time.png")

# 5. Create mean concentration-time plot (semi-log scale)
fig, ax = plt.subplots(figsize=(8, 5))
# Filter out time 0 for semi-log
mean_nonzero = mean_data[mean_data['mean'] > 0]
ax.errorbar(mean_nonzero['Time_h'], mean_nonzero['mean'], yerr=mean_nonzero['std'],
            marker='s', markersize=6, linewidth=2, capsize=4, capthick=1.5,
            color='#dc2626', ecolor='#ef4444', label='Mean ± SD (N=12)')

ax.set_yscale('log')
ax.set_xlabel('Time (hours)')
ax.set_ylabel('Theophylline Concentration (mg/L)')
ax.set_title('Mean Plasma Concentration-Time Profile (Semi-Log)\nTheophylline 320 mg Oral Dose (N=12)')
ax.legend(loc='upper right')
ax.set_xlim(-0.5, 25)
ax.grid(True, alpha=0.3, which='both')
plt.tight_layout()
plt.savefig(os.path.join(figures_dir, 'mean_concentration_time_semilog.png'),
            dpi=150, bbox_inches='tight', facecolor='white')
plt.close()
print("Created: mean_concentration_time_semilog.png")

# 6. Create combined plot (individual + mean overlay)
fig, ax = plt.subplots(figsize=(9, 6))

# Plot individual subjects in light gray
for subject in subjects:
    subject_data = df[df['Subject_ID'] == subject]
    ax.plot(subject_data['Time_h'], subject_data['Concentration_mg_L'],
            marker='o', markersize=3, linewidth=1, color='#94a3b8', alpha=0.4)

# Overlay mean with error bars
ax.errorbar(mean_data['Time_h'], mean_data['mean'], yerr=mean_data['std'],
            marker='s', markersize=7, linewidth=2.5, capsize=5, capthick=2,
            color='#dc2626', ecolor='#ef4444', label='Mean ± SD', zorder=10)

ax.set_xlabel('Time (hours)')
ax.set_ylabel('Theophylline Concentration (mg/L)')
ax.set_title('Individual and Mean Plasma Concentration-Time Profiles\nTheophylline 320 mg Oral Dose (N=12)')
ax.legend(loc='upper right')
ax.set_xlim(-0.5, 25)
ax.set_ylim(0, None)
ax.grid(True, alpha=0.3)

# Add annotation
ax.annotate('Gray lines: Individual subjects', xy=(0.02, 0.02), xycoords='axes fraction',
            fontsize=9, color='#64748b', style='italic')

plt.tight_layout()
plt.savefig(os.path.join(figures_dir, 'combined_concentration_time.png'),
            dpi=150, bbox_inches='tight', facecolor='white')
plt.close()
print("Created: combined_concentration_time.png")

print(f"\nAll plots saved to: {figures_dir}")
print("Plot files ready for demo data!")
