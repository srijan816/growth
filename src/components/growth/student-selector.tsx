'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Student {
  id: string;
  name: string;
  course: string;
  feedbackCount: number;
  classCount: number;
  feedbackTypes: string[];
  uniqueId?: string;
}

interface StudentSelectorProps {
  students: Student[];
  selectedStudent: string;
  onStudentSelect: (studentId: string) => void;
}

export function StudentSelector({
  students,
  selectedStudent,
  onStudentSelect,
}: StudentSelectorProps) {
  const [groupedStudents, setGroupedStudents] = useState<Map<string, Student[]>>(new Map());

  useEffect(() => {
    // Group students by name to identify those with multiple feedback types
    const grouped = new Map<string, Student[]>();
    
    students.forEach(student => {
      const key = student.name.toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(student);
    });
    
    setGroupedStudents(grouped);
  }, [students]);

  // Create options for select dropdown
  const selectOptions: { value: string; label: string; badges: string[] }[] = [];
  
  groupedStudents.forEach((studentGroup, nameKey) => {
    if (studentGroup.length === 1) {
      // Single entry - no collision
      const student = studentGroup[0];
      selectOptions.push({
        value: student.id,
        label: student.name,
        badges: student.feedbackTypes
      });
    } else {
      // Multiple entries - name collision
      studentGroup.forEach(student => {
        const feedbackTypes = student.feedbackTypes.join(', ');
        const label = `${student.name} (${feedbackTypes})`;
        selectOptions.push({
          value: `${student.id}_${feedbackTypes.replace(', ', '_')}`,
          label,
          badges: student.feedbackTypes
        });
      });
    }
  });

  // Sort options alphabetically
  selectOptions.sort((a, b) => a.label.localeCompare(b.label));

  return (
    <Select value={selectedStudent} onValueChange={onStudentSelect}>
      <SelectTrigger className="w-[300px]">
        <SelectValue placeholder="Select a student" />
      </SelectTrigger>
      <SelectContent>
        {selectOptions.map((option, optionIndex) => (
          <SelectItem key={`select_item_${optionIndex}_${option.value}`} value={option.value}>
            <div className="flex items-center gap-2">
              <span>{option.label}</span>
              {option.badges.map((badge, badgeIndex) => (
                <Badge
                  key={`${option.value}_badge_${badgeIndex}_${badge}`}
                  variant={badge === 'primary' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {badge}
                </Badge>
              ))}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}