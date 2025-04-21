import { Component, OnInit } from '@angular/core';

interface CharacterSegment {
  text: string;
  start: number;
  end: number;
  type: 'letters' | 'digits' | 'special';
}


interface PatternGroup {
  pattern: string;
  matches: string[];
  indices: number[];
  options: PatternOptions;
}

interface PatternOptions {
  patternType: 'exact' | 'repeating' | 'type';
  matchType: 'digit' | 'letter' | 'alphanumeric' | 'any';
  quantifier: 'exact' | 'oneOrMore' | 'zeroOrMore' | 'custom';
  minRepeat?: number;
  maxRepeat?: number;
}

interface PatternSegment {
  startPos: number;
  length: number;
  type: string;
  isRepeating: boolean;
  description: string;
}

interface RecognizedPattern {
  segments: PatternSegment[];
  pattern: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  sampleText: string = '';
  analyzedChars: string[] = [];
  selectedChars: Set<number> = new Set();
  recognizedPatterns: RecognizedPattern[] = [];
  generatedRegex: string = '';

  patternGroups: PatternGroup[] = [];
  characterSegments: CharacterSegment[] = [];
  selectionMode: 'individual' | 'group' = 'individual';

  // Pattern Options
  currentPatternType: 'exact' | 'repeating' | 'type' = 'exact';
  currentMatchType: 'digit' | 'letter' | 'alphanumeric' | 'any' = 'any';
  currentQuantifier: 'exact' | 'oneOrMore' | 'zeroOrMore' | 'custom' = 'exact';
  quantifierMin: number = 1;
  quantifierMax: number = 1;
  editingGroupIndex: number | null = null;


  ngOnInit() {}

  onTextInputChange(): void {
    if (this.sampleText.length > 0) {
      this.processSampleText();
    }
  }

  processSampleText(): void {
    this.analyzedChars = this.sampleText.split('');
    this.selectedChars.clear();
    this.patternGroups = [];
    this.editingGroupIndex = null;
    this.identifyCharacterSegments();
  }

  

  analyzePatterns(): void {
    this.recognizedPatterns = [];
    const patterns: RecognizedPattern[] = [];

    // Analyze digit sequences
    let currentPattern: PatternSegment[] = [];
    let isInDigitSequence = false;
    let sequenceStart = 0;

    for (let i = 0; i < this.analyzedChars.length; i++) {
      const char = this.analyzedChars[i];
      const isDigit = /\d/.test(char);

      if (isDigit && !isInDigitSequence) {
        isInDigitSequence = true;
        sequenceStart = i;
      } else if (!isDigit && isInDigitSequence) {
        currentPattern.push({
          startPos: sequenceStart,
          length: i - sequenceStart,
          type: 'digit',
          isRepeating: false,
          description: 'Digit sequence'
        });
        isInDigitSequence = false;
      }
    }

    if (isInDigitSequence) {
      currentPattern.push({
        startPos: sequenceStart,
        length: this.analyzedChars.length - sequenceStart,
        type: 'digit',
        isRepeating: false,
        description: 'Digit sequence'
      });
    }

    if (currentPattern.length > 0) {
      patterns.push({ segments: currentPattern, pattern: '\\d+' });
    }

    // Analyze repeating characters
    for (let i = 0; i < this.analyzedChars.length; i++) {
      if (this.isRepeatingChar(i)) {
        const char = this.analyzedChars[i];
        let repeatLength = 1;
        while (i + repeatLength < this.analyzedChars.length && 
               this.analyzedChars[i + repeatLength] === char) {
          repeatLength++;
        }

        patterns.push({
          segments: [{
            startPos: i,
            length: repeatLength,
            type: /\d/.test(char) ? 'digit' : /[a-zA-Z]/.test(char) ? 'letter' : 'special',
            isRepeating: true,
            description: `Repeating '${char}'`
          }],
          pattern: `(${this.escapeRegex(char)})\\1{${repeatLength - 1}}`
        });
      }
    }

    this.recognizedPatterns = patterns;
  }

 

  toggleCharSelection(index: number): void {
    if (this.selectionMode === 'individual') {
      if (this.selectedChars.has(index)) {
        this.selectedChars.delete(index);
      } else if (!this.isCharInGroup(index)) {
        this.selectedChars.add(index);
      }
    } else {
      // Group selection mode
      const segment = this.findAvailableSegment(index);
      if (segment) {
        const allSelected = this.isSegmentFullySelected(segment);
        for (let i = segment.start; i < segment.end; i++) {
          if (!this.isCharInGroup(i)) { // Only select if not already in a group
            if (allSelected) {
              this.selectedChars.delete(i);
            } else {
              this.selectedChars.add(i);
            }
          }
        }
      }
    }
  }
  isCharSelected(index: number): boolean {
    return this.selectedChars.has(index);
  }

  isCharInGroup(index: number): boolean {
    return this.patternGroups.some(group => group.indices.includes(index));
  }



  getCharacterType(index: number): 'letters' | 'digits' | 'special' {
    const char = this.analyzedChars[index];
    if (/\d/.test(char)) return 'digits';
    if (/[a-zA-Z]/.test(char)) return 'letters';
    return 'special';
  }
  isRepeatingChar(index: number): boolean {
    if (index === 0) return this.analyzedChars[0] === this.analyzedChars[1];
    if (index === this.analyzedChars.length - 1) {
      return this.analyzedChars[index] === this.analyzedChars[index - 1];
    }
    return this.analyzedChars[index] === this.analyzedChars[index - 1] ||
           this.analyzedChars[index] === this.analyzedChars[index + 1];
  }

  getCharacterStyle(index: number): any {
    const styles: any = {};
    if (this.isRepeatingChar(index)) {
      styles.borderBottom = '2px solid rgba(220, 53, 69, 0.5)';
    }
    return styles;
  }


  hasSelectedChars(): boolean {
    return this.selectedChars.size > 0;
  }


 

  updatePattern(): void {
    if (this.selectedChars.size === 0) {
      this.generatedRegex = '';
      return;
    }

    const selectedIndices = Array.from(this.selectedChars).sort((a, b) => a - b);
    let pattern = '';

    if (this.currentPatternType === 'exact') {
      pattern = selectedIndices
        .map(i => this.escapeRegex(this.analyzedChars[i]))
        .join('');
    } else if (this.currentPatternType === 'repeating') {
      pattern = `(${this.escapeRegex(this.analyzedChars[selectedIndices[0]])})\\1+`;
    } else {
      let charClass = '';
      switch (this.currentMatchType) {
        case 'digit': charClass = '\\d'; break;
        case 'letter': charClass = '[a-zA-Z]'; break;
        case 'alphanumeric': charClass = '[a-zA-Z0-9]'; break;
        case 'any': charClass = '.'; break;
      }
      pattern = charClass;
    }

    // Apply quantifier
    if (this.currentQuantifier !== 'exact' || this.currentPatternType === 'type') {
      pattern = pattern.replace(/[+*]$/, '');
      switch (this.currentQuantifier) {
        case 'oneOrMore': pattern += '+'; break;
        case 'zeroOrMore': pattern += '*'; break;
        case 'custom': 
          pattern += `{${this.quantifierMin},${this.quantifierMax}}`; break;
        case 'exact':
          pattern += `{${selectedIndices.length}}`; break;
      }
    }

    this.generatedRegex = pattern;
  }

  generatePattern(): string {
    const selectedIndices = Array.from(this.selectedChars).sort((a, b) => a - b);
    let pattern = '';

    if (this.currentPatternType === 'exact') {
      pattern = selectedIndices
        .map(i => this.escapeRegex(this.analyzedChars[i]))
        .join('');
    } else if (this.currentPatternType === 'repeating') {
      pattern = `(${this.escapeRegex(this.analyzedChars[selectedIndices[0]])})\\1+`;
    } else {
      let charClass = '';
      switch (this.currentMatchType) {
        case 'digit': charClass = '\\d'; break;
        case 'letter': charClass = '[a-zA-Z]'; break;
        case 'alphanumeric': charClass = '[a-zA-Z0-9]'; break;
        case 'any': charClass = '.'; break;
      }
      pattern = charClass;
    }

    // Apply quantifier
    if (this.currentQuantifier !== 'exact' || this.currentPatternType === 'type') {
      pattern = pattern.replace(/[+*]$/, '');
      switch (this.currentQuantifier) {
        case 'oneOrMore': pattern += '+'; break;
        case 'zeroOrMore': pattern += '*'; break;
        case 'custom': 
          pattern += `{${this.quantifierMin},${this.quantifierMax}}`; break;
        case 'exact':
          pattern += `{${selectedIndices.length}}`; break;
      }
    }

    return pattern;
  }
 

  createNewGroup(): void {
    if (this.selectedChars.size === 0) return;

    const pattern = this.generatePattern();
    const indices = Array.from(this.selectedChars).sort((a, b) => a - b);
    const matches = [this.getSelectedText()];

    const group: PatternGroup = {
      pattern,
      matches,
      indices,
      options: {
        patternType: this.currentPatternType,
        matchType: this.currentMatchType,
        quantifier: this.currentQuantifier,
        minRepeat: this.quantifierMin,
        maxRepeat: this.quantifierMax
      }
    };

    if (this.editingGroupIndex !== null) {
      this.patternGroups[this.editingGroupIndex] = group;
      this.editingGroupIndex = null;
    } else {
      this.patternGroups.push(group);
    }

    this.selectedChars.clear();
    this.resetOptions();
    // Refresh the available segments
    this.identifyCharacterSegments();
  }

  resetOptions(): void {
    this.currentPatternType = 'exact';
    this.currentMatchType = 'any';
    this.currentQuantifier = 'exact';
    this.quantifierMin = 1;
    this.quantifierMax = 1;
  }

  getSelectedText(): string {
    return Array.from(this.selectedChars)
      .sort((a, b) => a - b)
      .map(i => this.analyzedChars[i])
      .join('');
  }

  editGroup(index: number): void {
    const group = this.patternGroups[index];
    this.selectedChars = new Set(group.indices);
    this.currentPatternType = group.options.patternType;
    this.currentMatchType = group.options.matchType;
    this.currentQuantifier = group.options.quantifier;
    this.quantifierMin = group.options.minRepeat || 1;
    this.quantifierMax = group.options.maxRepeat || 1;
    this.editingGroupIndex = index;
  }

  removeGroup(index: number): void {
    this.patternGroups.splice(index, 1);
    if (this.editingGroupIndex === index) {
      this.editingGroupIndex = null;
      this.selectedChars.clear();
      this.resetOptions();
    }
  }

  getCombinedRegex(): string {
    return this.patternGroups.map(group => group.pattern).join('');
  }

  escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }


  identifyCharacterSegments(): void {
    this.characterSegments = [];
    let currentSegment: CharacterSegment | null = null;
    
    for (let i = 0; i < this.analyzedChars.length; i++) {
      // Skip if character is already in a group
      if (this.isCharInGroup(i)) {
        if (currentSegment) {
          this.characterSegments.push(currentSegment);
          currentSegment = null;
        }
        continue;
      }

      const char = this.analyzedChars[i];
      const type = this.getCharacterType(i);
      
      if (!currentSegment || currentSegment.type !== type) {
        if (currentSegment) {
          this.characterSegments.push(currentSegment);
        }
        currentSegment = {
          text: char,
          start: i,
          end: i + 1,
          type: type
        };
      } else {
        currentSegment.text += char;
        currentSegment.end = i + 1;
      }
    }
    
    if (currentSegment) {
      this.characterSegments.push(currentSegment);
    }
  }

 

  isSegmentFullySelected(segment: CharacterSegment): boolean {
    for (let i = segment.start; i < segment.end; i++) {
      if (!this.selectedChars.has(i)) return false;
    }
    return true;
  }

  getSegmentClass(segment: CharacterSegment): string {
    const baseClass = 'segment-indicator';
    const typeClass = segment.type === 'digits' ? 'bg-primary' : 
                     segment.type === 'letters' ? 'bg-success' : 'bg-warning';
    return `${baseClass} ${typeClass}`;
  }



  findAvailableSegment(index: number): CharacterSegment | null {
    // Find the current character type
    const currentType = this.getCharacterType(index);
    
    // Find start of available sequence
    let start = index;
    while (start > 0 && 
           this.getCharacterType(start - 1) === currentType && 
           !this.isCharInGroup(start - 1)) {
      start--;
    }
    
    // Find end of available sequence
    let end = index;
    while (end < this.analyzedChars.length && 
           this.getCharacterType(end) === currentType && 
           !this.isCharInGroup(end)) {
      end++;
    }
    
    // Only create segment if there are available characters
    if (start === end) return null;
    
    return {
      text: this.analyzedChars.slice(start, end).join(''),
      start,
      end,
      type: currentType
    };
  }

 

  // Update this method to refresh segments after group changes
 

}