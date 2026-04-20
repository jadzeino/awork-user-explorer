import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { FilterService } from '../../../../core/services/filter.service';
import { environment } from '../../../../../environments/environment';

interface AgentFilters {
  gender?: string[];
  country?: string[];
  city?: string[];
  nat?: string[];
  age?: { min?: number; max?: number };
}

interface AgentResponse {
  action: 'filter' | 'error';
  filters?: AgentFilters;
  reason?: string;
}

interface ParsedSummary {
  parts: string[];
}

const SYSTEM_PROMPT = `You are a filter compiler for a user directory application.
The user describes people they want to find. Respond ONLY with valid JSON — no prose, no markdown, no explanation.
Use this exact schema:
{"action":"filter","filters":{"gender?":["male"|"female"|"other"],"country?":["string"],"city?":["string"],"nat?":["ISO-2 code"],"age?":{"min?":number,"max?":number}}}
If the intent is unclear, respond: {"action":"error","reason":"string"}
Never include any text outside the JSON object.`;

@Component({
  selector: 'app-agent-mode',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './agent-mode.component.html',
  styleUrl: './agent-mode.component.scss',
})
export class AgentModeComponent {
  private readonly http = inject(HttpClient);
  private readonly filterService = inject(FilterService);

  readonly query = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly summary = signal<ParsedSummary | null>(null);
  readonly hasApiKey = !!environment.anthropicApiKey;

  submit(): void {
    const q = this.query().trim();
    if (!q || this.loading()) return;

    if (!this.hasApiKey) {
      this.error.set('No API key configured. Add your Anthropic API key to src/environments/environment.ts');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.summary.set(null);

    const headers = new HttpHeaders({
      'x-api-key': environment.anthropicApiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    });

    const body = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: q }],
    };

    this.http.post<{ content: { text: string }[] }>(
      'https://api.anthropic.com/v1/messages',
      body,
      { headers }
    ).subscribe({
      next: (res) => {
        this.loading.set(false);
        const text = res?.content?.[0]?.text?.trim() ?? '';
        this.applyResponse(text);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Request failed. Check your API key and network connection.');
      },
    });
  }

  private applyResponse(text: string): void {
    let parsed: AgentResponse;
    try {
      parsed = JSON.parse(text) as AgentResponse;
    } catch {
      this.error.set('Could not parse response. Try rephrasing.');
      return;
    }

    if (parsed.action === 'error') {
      this.error.set(`Could not interpret: "${parsed.reason ?? 'unknown reason'}". Try rephrasing.`);
      return;
    }

    if (parsed.action !== 'filter' || !parsed.filters) {
      this.error.set('Unexpected response format. Try rephrasing.');
      return;
    }

    const f = parsed.filters;
    const summaryParts: string[] = [];

    const patch: Parameters<typeof this.filterService.update>[0] = {
      filterGender: '', filterNats: [], filterAgeMin: 0, filterAgeMax: 0,
      filterCountry: '', filterCity: '',
    };

    if (f.gender?.length) {
      patch.filterGender = f.gender[0].toLowerCase();
      summaryParts.push(capitalize(f.gender[0]));
    }
    if (f.nat?.length) {
      patch.filterNats = f.nat.map(n => n.toUpperCase());
      summaryParts.push(...f.nat.map(n => n.toUpperCase()));
    }
    if (f.country?.length) {
      patch.filterCountry = f.country[0];
      summaryParts.push(f.country[0]);
    }
    if (f.city?.length) {
      patch.filterCity = f.city[0];
      summaryParts.push(f.city[0]);
    }
    if (f.age) {
      if (f.age.min != null) { patch.filterAgeMin = f.age.min; summaryParts.push(`Age ≥ ${f.age.min}`); }
      if (f.age.max != null) { patch.filterAgeMax = f.age.max; summaryParts.push(`Age ≤ ${f.age.max}`); }
    }

    this.filterService.update(patch);
    this.summary.set({ parts: summaryParts });
  }

  clearAgent(): void {
    this.query.set('');
    this.summary.set(null);
    this.error.set(null);
    this.filterService.update({
      filterGender: '', filterNats: [], filterAgeMin: 0, filterAgeMax: 0,
      filterCountry: '', filterCity: '', nlQuery: '',
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
