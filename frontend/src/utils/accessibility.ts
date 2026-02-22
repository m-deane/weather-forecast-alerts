// Accessibility compliance checker and utilities
import { useState, useEffect } from 'react'

export interface AccessibilityIssue {
  severity: 'error' | 'warning' | 'info'
  type: 'contrast' | 'keyboard' | 'aria' | 'semantic' | 'focus' | 'alt-text'
  element: string
  description: string
  recommendation: string
  wcagGuideline: string
}

export class AccessibilityChecker {
  private issues: AccessibilityIssue[] = []

  // Check color contrast ratios
  checkColorContrast(element: HTMLElement): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = []
    const computedStyle = window.getComputedStyle(element)
    const textColor = computedStyle.color
    const backgroundColor = computedStyle.backgroundColor

    if (textColor && backgroundColor) {
      const contrast = this.calculateContrastRatio(textColor, backgroundColor)
      const fontSize = parseFloat(computedStyle.fontSize)
      const fontWeight = computedStyle.fontWeight

      // WCAG AA requirements
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && (fontWeight === 'bold' || parseInt(fontWeight) >= 700))
      const minContrast = isLargeText ? 3 : 4.5
      const minContrastAAA = isLargeText ? 4.5 : 7

      if (contrast < minContrast) {
        issues.push({
          severity: 'error',
          type: 'contrast',
          element: this.getElementSelector(element),
          description: `Color contrast ratio is ${contrast.toFixed(2)}:1, below WCAG AA minimum of ${minContrast}:1`,
          recommendation: `Increase contrast to at least ${minContrast}:1 for WCAG AA compliance`,
          wcagGuideline: '1.4.3 Contrast (Minimum)'
        })
      } else if (contrast < minContrastAAA) {
        issues.push({
          severity: 'warning',
          type: 'contrast',
          element: this.getElementSelector(element),
          description: `Color contrast ratio is ${contrast.toFixed(2)}:1, below WCAG AAA minimum of ${minContrastAAA}:1`,
          recommendation: `Consider increasing contrast to ${minContrastAAA}:1 for WCAG AAA compliance`,
          wcagGuideline: '1.4.6 Contrast (Enhanced)'
        })
      }
    }

    return issues
  }

  // Check keyboard accessibility
  checkKeyboardAccessibility(element: HTMLElement): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = []
    const tagName = element.tagName.toLowerCase()
    const isInteractive = this.isInteractiveElement(element)

    if (isInteractive) {
      // Check if element is focusable
      if (!this.isFocusable(element)) {
        issues.push({
          severity: 'error',
          type: 'keyboard',
          element: this.getElementSelector(element),
          description: 'Interactive element is not keyboard focusable',
          recommendation: 'Add tabindex="0" or ensure element is naturally focusable',
          wcagGuideline: '2.1.1 Keyboard'
        })
      }

      // Check for custom interactive elements without proper roles
      if (['div', 'span'].includes(tagName) && !element.getAttribute('role')) {
        issues.push({
          severity: 'warning',
          type: 'keyboard',
          element: this.getElementSelector(element),
          description: 'Custom interactive element missing appropriate role',
          recommendation: 'Add appropriate ARIA role (button, link, etc.)',
          wcagGuideline: '4.1.2 Name, Role, Value'
        })
      }
    }

    return issues
  }

  // Check ARIA attributes
  checkAriaAttributes(element: HTMLElement): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = []
    const ariaLabel = element.getAttribute('aria-label')
    const ariaLabelledBy = element.getAttribute('aria-labelledby')
    const ariaDescribedBy = element.getAttribute('aria-describedby')
    const role = element.getAttribute('role')

    // Check for missing labels on form elements
    if (this.isFormElement(element)) {
      const hasLabel = this.hasAssociatedLabel(element)
      if (!hasLabel && !ariaLabel && !ariaLabelledBy) {
        issues.push({
          severity: 'error',
          type: 'aria',
          element: this.getElementSelector(element),
          description: 'Form element missing accessible label',
          recommendation: 'Add a <label> element, aria-label, or aria-labelledby attribute',
          wcagGuideline: '3.3.2 Labels or Instructions'
        })
      }
    }

    // Check for invalid ARIA attributes
    if (role && !this.isValidAriaRole(role)) {
      issues.push({
        severity: 'error',
        type: 'aria',
        element: this.getElementSelector(element),
        description: `Invalid ARIA role: "${role}"`,
        recommendation: 'Use a valid ARIA role or remove the role attribute',
        wcagGuideline: '4.1.2 Name, Role, Value'
      })
    }

    // Check for aria-describedby pointing to non-existent elements
    if (ariaDescribedBy) {
      const describedElements = ariaDescribedBy.split(' ')
      for (const id of describedElements) {
        if (!document.getElementById(id)) {
          issues.push({
            severity: 'error',
            type: 'aria',
            element: this.getElementSelector(element),
            description: `aria-describedby references non-existent element: "${id}"`,
            recommendation: 'Ensure the referenced element exists or remove the reference',
            wcagGuideline: '4.1.2 Name, Role, Value'
          })
        }
      }
    }

    return issues
  }

  // Check semantic HTML structure
  checkSemanticStructure(element: HTMLElement): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = []
    const tagName = element.tagName.toLowerCase()

    // Check for missing main landmark
    if (tagName === 'body') {
      const hasMain = element.querySelector('main, [role="main"]')
      if (!hasMain) {
        issues.push({
          severity: 'warning',
          type: 'semantic',
          element: 'body',
          description: 'Page missing main landmark',
          recommendation: 'Add a <main> element or element with role="main"',
          wcagGuideline: '1.3.1 Info and Relationships'
        })
      }
    }

    // Check heading hierarchy
    if (tagName.match(/^h[1-6]$/)) {
      const headingLevel = parseInt(tagName.charAt(1))
      const previousHeadings = this.getPreviousHeadings(element)
      
      if (previousHeadings.length > 0) {
        const lastHeadingLevel = previousHeadings[previousHeadings.length - 1]
        if (headingLevel > lastHeadingLevel + 1) {
          issues.push({
            severity: 'warning',
            type: 'semantic',
            element: this.getElementSelector(element),
            description: `Heading level skipped from h${lastHeadingLevel} to h${headingLevel}`,
            recommendation: 'Use sequential heading levels for better structure',
            wcagGuideline: '1.3.1 Info and Relationships'
          })
        }
      } else if (headingLevel !== 1) {
        issues.push({
          severity: 'warning',
          type: 'semantic',
          element: this.getElementSelector(element),
          description: 'Page should start with h1 heading',
          recommendation: 'Use h1 for the main page heading',
          wcagGuideline: '1.3.1 Info and Relationships'
        })
      }
    }

    return issues
  }

  // Check focus management
  checkFocusManagement(): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = []
    const focusableElements = this.getFocusableElements()

    // Check for focus traps in modals
    const modals = document.querySelectorAll('[role="dialog"], .modal')
    modals.forEach(modal => {
      if (modal.contains(document.activeElement)) {
        const modalFocusableElements = this.getFocusableElements(modal as HTMLElement)
        if (modalFocusableElements.length === 0) {
          issues.push({
            severity: 'error',
            type: 'focus',
            element: this.getElementSelector(modal as HTMLElement),
            description: 'Modal/dialog contains no focusable elements',
            recommendation: 'Ensure modal has at least one focusable element',
            wcagGuideline: '2.4.3 Focus Order'
          })
        }
      }
    })

    // Check for visible focus indicators
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement !== document.body) {
      const computedStyle = window.getComputedStyle(activeElement, ':focus')
      const hasVisibleFocus = this.hasVisibleFocusIndicator(computedStyle)
      
      if (!hasVisibleFocus) {
        issues.push({
          severity: 'warning',
          type: 'focus',
          element: this.getElementSelector(activeElement),
          description: 'Element lacks visible focus indicator',
          recommendation: 'Add CSS focus styles to make focus visible',
          wcagGuideline: '2.4.7 Focus Visible'
        })
      }
    }

    return issues
  }

  // Check alt text for images
  checkAltText(element: HTMLElement): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = []
    const tagName = element.tagName.toLowerCase()

    if (tagName === 'img') {
      const alt = element.getAttribute('alt')
      const src = element.getAttribute('src')

      if (alt === null) {
        issues.push({
          severity: 'error',
          type: 'alt-text',
          element: this.getElementSelector(element),
          description: 'Image missing alt attribute',
          recommendation: 'Add alt attribute with descriptive text or empty alt="" for decorative images',
          wcagGuideline: '1.1.1 Non-text Content'
        })
      } else if (alt.length > 0) {
        // Check for poor alt text
        const poorAltText = ['image', 'picture', 'photo', 'graphic', 'icon']
        if (poorAltText.some(word => alt.toLowerCase().includes(word))) {
          issues.push({
            severity: 'warning',
            type: 'alt-text',
            element: this.getElementSelector(element),
            description: 'Alt text may not be descriptive enough',
            recommendation: 'Use descriptive alt text that explains the image content or function',
            wcagGuideline: '1.1.1 Non-text Content'
          })
        }

        // Check for very long alt text
        if (alt.length > 150) {
          issues.push({
            severity: 'warning',
            type: 'alt-text',
            element: this.getElementSelector(element),
            description: 'Alt text is very long (over 150 characters)',
            recommendation: 'Consider using shorter alt text with additional description in nearby text',
            wcagGuideline: '1.1.1 Non-text Content'
          })
        }
      }
    }

    return issues
  }

  // Run comprehensive accessibility audit
  auditPage(): AccessibilityIssue[] {
    this.issues = []
    const allElements = document.querySelectorAll('*')

    allElements.forEach(element => {
      const htmlElement = element as HTMLElement
      
      this.issues.push(...this.checkColorContrast(htmlElement))
      this.issues.push(...this.checkKeyboardAccessibility(htmlElement))
      this.issues.push(...this.checkAriaAttributes(htmlElement))
      this.issues.push(...this.checkSemanticStructure(htmlElement))
      this.issues.push(...this.checkAltText(htmlElement))
    })

    this.issues.push(...this.checkFocusManagement())

    return this.issues
  }

  // Get accessibility score
  getAccessibilityScore(): {
    score: number
    grade: 'A' | 'B' | 'C' | 'D' | 'F'
    issues: AccessibilityIssue[]
    summary: {
      errors: number
      warnings: number
      info: number
    }
  } {
    const issues = this.auditPage()
    const errors = issues.filter(i => i.severity === 'error').length
    const warnings = issues.filter(i => i.severity === 'warning').length
    const info = issues.filter(i => i.severity === 'info').length

    // Calculate score (100 - penalties)
    let score = 100
    score -= errors * 10 // 10 points per error
    score -= warnings * 3 // 3 points per warning
    score -= info * 1 // 1 point per info

    score = Math.max(0, score)

    let grade: 'A' | 'B' | 'C' | 'D' | 'F'
    if (score >= 90) grade = 'A'
    else if (score >= 80) grade = 'B'
    else if (score >= 70) grade = 'C'
    else if (score >= 60) grade = 'D'
    else grade = 'F'

    return {
      score,
      grade,
      issues,
      summary: { errors, warnings, info }
    }
  }

  // Helper methods
  private calculateContrastRatio(color1: string, color2: string): number {
    const rgb1 = this.parseColor(color1)
    const rgb2 = this.parseColor(color2)
    
    const l1 = this.getLuminance(rgb1)
    const l2 = this.getLuminance(rgb2)
    
    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)
    
    return (lighter + 0.05) / (darker + 0.05)
  }

  private parseColor(color: string): [number, number, number] {
    const div = document.createElement('div')
    div.style.color = color
    document.body.appendChild(div)
    const computedColor = window.getComputedStyle(div).color
    document.body.removeChild(div)

    const match = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
    if (match) {
      return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
    }
    return [0, 0, 0]
  }

  private getLuminance([r, g, b]: [number, number, number]): number {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  private getElementSelector(element: HTMLElement): string {
    const id = element.id
    const className = element.className
    const tagName = element.tagName.toLowerCase()

    if (id) return `#${id}`
    if (className) return `${tagName}.${className.split(' ')[0]}`
    return tagName
  }

  private isInteractiveElement(element: HTMLElement): boolean {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea']
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem']
    const hasClickHandler = element.onclick !== null

    return interactiveTags.includes(element.tagName.toLowerCase()) ||
           interactiveRoles.includes(element.getAttribute('role') || '') ||
           hasClickHandler
  }

  private isFocusable(element: HTMLElement): boolean {
    const tabIndex = element.getAttribute('tabindex')
    if (tabIndex === '-1') return false
    if (tabIndex && parseInt(tabIndex) >= 0) return true

    const focusableTags = ['button', 'a', 'input', 'select', 'textarea']
    return focusableTags.includes(element.tagName.toLowerCase()) && !element.hasAttribute('disabled')
  }

  private isFormElement(element: HTMLElement): boolean {
    const formTags = ['input', 'select', 'textarea']
    return formTags.includes(element.tagName.toLowerCase())
  }

  private hasAssociatedLabel(element: HTMLElement): boolean {
    const id = element.id
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`)
      if (label) return true
    }

    // Check if element is inside a label
    return !!element.closest('label')
  }

  private isValidAriaRole(role: string): boolean {
    const validRoles = [
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
      'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
      'contentinfo', 'definition', 'dialog', 'directory', 'document',
      'feed', 'figure', 'form', 'grid', 'gridcell', 'group', 'heading',
      'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
      'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
      'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
      'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
      'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
      'slider', 'spinbutton', 'status', 'switch', 'tab', 'table',
      'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar',
      'tooltip', 'tree', 'treegrid', 'treeitem'
    ]
    return validRoles.includes(role)
  }

  private getPreviousHeadings(element: HTMLElement): number[] {
    const headings: number[] = []
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const el = node as HTMLElement
          return el.tagName.match(/^H[1-6]$/) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
        }
      }
    )

    let currentNode = walker.nextNode()
    while (currentNode && currentNode !== element) {
      const heading = currentNode as HTMLElement
      const level = parseInt(heading.tagName.charAt(1))
      headings.push(level)
      currentNode = walker.nextNode()
    }

    return headings
  }

  private getFocusableElements(container: HTMLElement = document.body): HTMLElement[] {
    const focusableSelectors = [
      'a[href]',
      'area[href]',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'button:not([disabled])',
      'iframe',
      'object',
      'embed',
      '[contenteditable]',
      '[tabindex]:not([tabindex^="-"])'
    ]

    return Array.from(container.querySelectorAll(focusableSelectors.join(','))) as HTMLElement[]
  }

  private hasVisibleFocusIndicator(computedStyle: CSSStyleDeclaration): boolean {
    const outline = computedStyle.outline
    const outlineWidth = computedStyle.outlineWidth
    const boxShadow = computedStyle.boxShadow
    const border = computedStyle.border

    return outline !== 'none' ||
           (!!outlineWidth && outlineWidth !== '0px') ||
           (!!boxShadow && boxShadow !== 'none') ||
           (!!border && border !== 'none')
  }
}

// React hook for accessibility monitoring
export function useAccessibilityMonitoring() {
  const [accessibilityScore, setAccessibilityScore] = useState<any>(null)

  useEffect(() => {
    const checker = new AccessibilityChecker()
    const score = checker.getAccessibilityScore()
    setAccessibilityScore(score)
  }, [])

  return { accessibilityScore }
}

// Export singleton instance
export const accessibilityChecker = new AccessibilityChecker()