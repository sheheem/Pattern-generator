import { Component, OnInit, HostListener } from '@angular/core';

interface PatternSegment {
  text: string;
  start: number;
  end: number;
  type: string;
  isPattern: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'regex-generator';

  // Text input and processing
  sampleText: string = '';
  testText: string = '';
  generatedRegex: string = '';
  processedText: PatternSegment[] = [];
  selectedPatterns: number[] = [];
  testMatches: string[] = [];
  
  // Pattern customization
  patternCustomizations: { [key: number]: any } = {};
  activeDropdownIndex: number | null = null;
  
  // Global options
  onlyPatterns: boolean = false;
  matchWholeLine: boolean = false;
  captureGroups: boolean = false;
  
  // UI state management
  currentStep: number = 1;
  
  // Helper methods for the single-step UI
  onTextInputChange(): void {
    // Auto-identify patterns as the user types if text is not too long
    if (this.sampleText.length < 100) {
      this.processSampleText();
    }
  }
  
  copyRegexToClipboard(): void {
    navigator.clipboard.writeText(this.generatedRegex)
      .then(() => {
        // Could add a toast notification here
        console.log('Copied to clipboard');
      })
      .catch(err => {
        console.error('Could not copy text: ', err);
      });
  }
  
  // Pattern types and their regex
  patternTypes: { [key: string]: string } = {
    'digits': '\\d+',
    'letters': '[A-Za-z]+',
    'alphanumeric': '[A-Za-z0-9]+',
    'whitespace': '\\s+',
    'email': '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}',
    'url': '(https?://)?[a-zA-Z0-9][-a-zA-Z0-9.]+[a-zA-Z0-9](/[-a-zA-Z0-9%_.~#?&=]*)?',
    'date': '\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}',
    'time': '\\d{1,2}:\\d{2}(:\\d{2})?',
    'ip': '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}',
    'repeated_digits': '(\\d)\\1+',
    'repeated_letters': '([A-Za-z])\\1+'
  };

  constructor() {}

  ngOnInit(): void {
    // Initialize empty state
  }

  processSampleText(): void {
    if (!this.sampleText.trim()) {
      return;
    }
    
    this.processedText = [];
    this.selectedPatterns = [];
    this.patternCustomizations = {};
    
    let currentPosition = 0;
    const text = this.sampleText;
    
    // Pattern detection algorithm
    while (currentPosition < text.length) {
      let matchFound = false;
      
      // Check for each pattern type
      for (const [patternName, regex] of Object.entries(this.patternTypes)) {
        const pattern = new RegExp('^' + regex);
        const remainingText = text.substring(currentPosition);
        const match = remainingText.match(pattern);
        
        if (match && match[0]) {
          this.processedText.push({
            text: match[0],
            start: currentPosition,
            end: currentPosition + match[0].length,
            type: patternName,
            isPattern: true
          });
          
          currentPosition += match[0].length;
          matchFound = true;
          break;
        }
      }
      
      // If no pattern matched, treat as plain text
      if (!matchFound) {
        let plainTextEnd = currentPosition + 1;
        
        // Look ahead to find the next potential pattern start
        for (let i = plainTextEnd; i < text.length; i++) {
          let mightBePattern = false;
          
          for (const regex of Object.values(this.patternTypes)) {
            if (new RegExp('^' + regex).test(text.substring(i))) {
              mightBePattern = true;
              break;
            }
          }
          
          if (mightBePattern) {
            plainTextEnd = i;
            break;
          } else if (i === text.length - 1) {
            plainTextEnd = text.length;
          }
        }
        
        this.processedText.push({
          text: text.substring(currentPosition, plainTextEnd),
          start: currentPosition,
          end: plainTextEnd,
          type: 'plain',
          isPattern: false
        });
        
        currentPosition = plainTextEnd;
      }
    }
    
    this.currentStep = 2;
  }

  togglePattern(index: number): void {
    const patternIndex = this.selectedPatterns.indexOf(index);
    
    if (patternIndex === -1) {
      this.selectedPatterns.push(index);
      // Initialize customization options for this pattern
      this.initializePatternOptions(index);
    } else {
      this.selectedPatterns.splice(patternIndex, 1);
      // Clean up customization options
      delete this.patternCustomizations[index];
    }
    
    this.generateRegex();
  }

  initializePatternOptions(index: number): void {
    const pattern = this.processedText[index];
    let defaultOptions = {
      matchType: 'arbitrary', // arbitrary or exact
      case: 'preserve', // preserve, uppercase, lowercase, any
      detectRepeats: false,
      quantifier: 'exact', // exact, oneOrMore, zeroOrMore
    };
    
    // Set specific defaults based on pattern type
    if (pattern.type === 'digits') {
      defaultOptions.case = 'any'; // Case doesn't apply to digits
    }
    
    // Check if the pattern text is all uppercase
    if (pattern.text === pattern.text.toUpperCase() && pattern.text !== pattern.text.toLowerCase()) {
      defaultOptions.case = 'uppercase';
    }
    
    // Check if the pattern text is all lowercase
    if (pattern.text === pattern.text.toLowerCase() && pattern.text !== pattern.text.toUpperCase()) {
      defaultOptions.case = 'lowercase';
    }
    
    this.patternCustomizations[index] = defaultOptions;
  }

  showPatternOptions(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.activeDropdownIndex = index;
  }

  closePatternOptions(event: MouseEvent): void {
    event.stopPropagation();
    this.activeDropdownIndex = null;
  }
  
  @HostListener('document:click')
  onDocumentClick(): void {
    // Close dropdown when clicking outside
    this.activeDropdownIndex = null;
  }

  isPatternSelected(index: number): boolean {
    return this.selectedPatterns.includes(index);
  }

  getPatternOption(index: number, option: string): any {
    if (!this.patternCustomizations[index]) {
      return null;
    }
    return this.patternCustomizations[index][option];
  }

  setPatternOption(index: number, option: string, value: Event): void {
    if (!this.patternCustomizations[index]) {
      this.initializePatternOptions(index);
    }
    const target = value.target as HTMLInputElement | HTMLSelectElement;
    this.patternCustomizations[index][option] = 'checked' in target ? target.checked : target.value;
    this.generateRegex();
  }

  generateRegex(): void {
    if (this.selectedPatterns.length === 0) {
      this.generatedRegex = '';
      return;
    }
    
    let regex = '';
    let lastEnd = 0;
    
    // Sort selected patterns by position
    const sortedPatterns = [...this.selectedPatterns].sort((a, b) => 
      this.processedText[a].start - this.processedText[b].start
    );
    
    if (this.matchWholeLine) {
      regex += '^';
    }
    
    for (const index of sortedPatterns) {
      const pattern = this.processedText[index];
      
      // Include text between patterns if not using "only patterns" option
      if (!this.onlyPatterns && pattern.start > lastEnd) {
        const textBetween = this.escapeRegex(
          this.sampleText.substring(lastEnd, pattern.start)
        );
        regex += textBetween;
      }
      
      // Start capture group if enabled
      if (this.captureGroups) {
        regex += '(';
      }
      
      // Generate the pattern based on customization options
      let patternRegex = this.generateCustomizedPattern(index);
      regex += patternRegex;
      
      // End capture group if enabled
      if (this.captureGroups) {
        regex += ')';
      }
      
      lastEnd = pattern.end;
    }
    
    // Add any remaining text after the last pattern if not using "only patterns"
    if (!this.onlyPatterns && lastEnd < this.sampleText.length) {
      regex += this.escapeRegex(this.sampleText.substring(lastEnd));
    }
    
    if (this.matchWholeLine) {
      regex += '$';
    }
    
    this.generatedRegex = regex;
    this.testRegex();
  }

  generateCustomizedPattern(index: number): string {
    const pattern = this.processedText[index];
    const options = this.patternCustomizations[index];
    
    if (!options) {
      return this.patternTypes[pattern.type];
    }
    
    let result = '';
    
    // Handle match type
    if (options.matchType === 'exact') {
      result = this.escapeRegex(pattern.text);
    } else {
      // Handle case sensitivity for character patterns
      if (pattern.type === 'letters' || pattern.type === 'alphanumeric') {
        if (options.case === 'uppercase') {
          result = '[A-Z]';
        } else if (options.case === 'lowercase') {
          result = '[a-z]';
        } else if (options.case === 'any') {
          result = '[A-Za-z]';
        } else { // preserve
          // Analyze the pattern and create a character class that matches the case pattern
          result = this.createPreserveCasePattern(pattern.text);
        }
        
        // Handle alphanumeric
        if (pattern.type === 'alphanumeric') {
          result = result.replace('[A-Z]', '[A-Z0-9]').replace('[a-z]', '[a-z0-9]').replace('[A-Za-z]', '[A-Za-z0-9]');
        }
      } else if (options.detectRepeats && (pattern.type === 'digits' || pattern.type === 'letters')) {
        // Handle repeating characters detection
        if (pattern.type === 'digits') {
          result = '(\\d)\\1+';
        } else { // letters
          if (options.case === 'uppercase') {
            result = '([A-Z])\\1+';
          } else if (options.case === 'lowercase') {
            result = '([a-z])\\1+';
          } else {
            result = '([A-Za-z])\\1+';
          }
        }
      } else {
        // Use the default pattern for this type
        result = this.patternTypes[pattern.type];
      }
    }
    
    // Handle quantifiers
    if (options.matchType !== 'exact' && options.quantifier !== 'oneOrMore' && !options.detectRepeats) {
      // Remove any existing quantifiers first
      result = result.replace(/[+*]$/, '');
      
      if (options.quantifier === 'exact') {
        result += `{${pattern.text.length}}`;
      } else if (options.quantifier === 'zeroOrMore') {
        result += '*';
      } else {
        result += '+';
      }
    }
    
    return result;
  }

  createPreserveCasePattern(text: string): string {
    let hasUpper = false;
    let hasLower = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char >= 'A' && char <= 'Z') {
        hasUpper = true;
      } else if (char >= 'a' && char <= 'z') {
        hasLower = true;
      }
    }
    
    if (hasUpper && hasLower) {
      return '[A-Za-z]';
    } else if (hasUpper) {
      return '[A-Z]';
    } else {
      return '[a-z]';
    }
  }

  escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  testRegex(): void {
    if (!this.testText || !this.generatedRegex) {
      this.testMatches = [];
      return;
    }
    
    try {
      const regex = new RegExp(this.generatedRegex, 'g');
      const matches = this.testText.match(regex);
      this.testMatches = matches || [];
    } catch (e) {
      console.error('Invalid regex:', e);
      this.testMatches = [];
    }
  }

  goToStep(step: number): void {
    if (step === 1) {
      this.currentStep = 1;
    } else if (step === 2 && this.sampleText.trim()) {
      this.processSampleText();
    } else if (step === 3 && this.selectedPatterns.length > 0) {
      this.generateRegex();
      this.currentStep = 3;
    }
  }
}