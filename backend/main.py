from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from groq import Groq
import cohere
import asyncio
import re
import json
import time
import warnings
warnings.filterwarnings("ignore")
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────
# PASTE YOUR KEYS HERE
# ─────────────────────────────────────────

GEMINI_KEY = "AIzaSyAHBobYgnDtcSGN5Cxf8txZqm5mw4OtS1w"
GROQ_KEY   = "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"
COHERE_KEY = "XR4jCFcLz5dxjgMc6ayDhAsmfJkOlXgBhv1B7AJQ"

genai.configure(api_key=GEMINI_KEY)
groq_client   = Groq(api_key=GROQ_KEY)
cohere_client = cohere.Client(api_key=COHERE_KEY)

print("✅ Gemini Ready!")
print("✅ Groq Ready!")
print("✅ Cohere Ready!")

# ─────────────────────────────────────────
# DATA MODEL
# ─────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str
    your_brand: Optional[str] = None

# ─────────────────────────────────────────
# BUILD PROMPT
# ─────────────────────────────────────────

def build_prompt(
    fixed_query: str,
    fixed_brand: Optional[str],
    category: str
) -> str:
    if fixed_brand:
        return f"""You are a helpful Amazon shopping assistant.
A shopper searched for: "{fixed_query}"
They want to check if brand "{fixed_brand}" is recommended.
Product category: {category}

List TOP 7 brands for this search.
Format EXACTLY: "1. BrandName: reason why"
Include "{fixed_brand}" if it fits this category.
Always give exactly 7 recommendations.
Be helpful even if query has typos."""
    else:
        return f"""You are a helpful Amazon shopping assistant.
A shopper searched for: "{fixed_query}"
Product category: {category}

List TOP 7 best brands for this search.
Format EXACTLY: "1. BrandName: reason why"
Use real well known brand names.
Always give exactly 7 recommendations.
Be helpful even if query has typos."""

# ─────────────────────────────────────────
# STEP 1: FIX SPELLING USING GROQ
# ─────────────────────────────────────────

def understand_query(
    query: str,
    brand: Optional[str]
) -> dict:
    try:
        if brand:
            prompt = f"""Fix ALL spelling mistakes in this shopping query and brand name.
Query: "{query}"
Brand: "{brand}"

Examples:
- "wieght gain" → "weight gain"
- "protien" → "protein"
- "natre made" → "Nature Made"

Return ONLY this JSON:
{{
    "fixed_query": "corrected query here",
    "fixed_brand": "corrected brand here",
    "category": "product category here",
    "search_intent": "what user wants"
}}"""
        else:
            prompt = f"""Fix ALL spelling mistakes in this shopping query.
Query: "{query}"

Return ONLY this JSON:
{{
    "fixed_query": "corrected query here",
    "fixed_brand": null,
    "category": "product category here",
    "search_intent": "what user wants"
}}"""

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You fix spelling mistakes. Return ONLY valid JSON. No extra text."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=200,
            temperature=0.1
        )

        text = response.choices[0].message.content.strip()
        print(f"✅ Fixed: {text}")
        json_match = re.search(r'\{.*?\}', text, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())

    except Exception as e:
        print(f"❌ Fix error: {e}")

    return {
        "fixed_query": query,
        "fixed_brand": brand,
        "category": "general product",
        "search_intent": query
    }

# ─────────────────────────────────────────
# ENGINE 1: GROQ (FREE - FASTEST)
# ─────────────────────────────────────────

def query_groq(
    fixed_query: str,
    fixed_brand: Optional[str],
    category: str,
    intent: str
) -> str:
    try:
        prompt = build_prompt(fixed_query, fixed_brand, category)

        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are an Amazon shopping expert. Give exactly 7 numbered brand recommendations in format '1. BrandName: reason'"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=800,
            temperature=0.7
        )
        result = response.choices[0].message.content
        print(f"✅ Groq done!")
        return result

    except Exception as e:
        print(f"❌ Groq error: {e}")
        return f"FAILED: {str(e)}"

# ─────────────────────────────────────────
# ENGINE 2: GEMINI (FREE)
# ─────────────────────────────────────────

def query_gemini(
    fixed_query: str,
    fixed_brand: Optional[str],
    category: str,
    intent: str
) -> str:
    try:
        prompt = build_prompt(fixed_query, fixed_brand, category)

        model = genai.GenerativeModel("models/gemini-2.0-flash")
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=800,
                temperature=0.7,
            )
        )
        result = response.text
        print(f"✅ Gemini done!")
        return result

    except Exception as e:
        error_msg = str(e)
        print(f"❌ Gemini error: {error_msg}")
        if "429" in error_msg or "quota" in error_msg.lower():
            print("⏳ Gemini rate limit - waiting 10s...")
            time.sleep(10)
            try:
                model = genai.GenerativeModel("models/gemini-2.0-flash")
                response = model.generate_content(prompt)
                print("✅ Gemini retry worked!")
                return response.text
            except:
                return "RATE_LIMIT: Gemini quota exceeded"
        return f"FAILED: {error_msg}"

# ─────────────────────────────────────────
# ENGINE 3: COHERE (FREE)
# ─────────────────────────────────────────

def query_cohere(
    fixed_query: str,
    fixed_brand: Optional[str],
    category: str,
    intent: str
) -> str:
    try:
        prompt = build_prompt(fixed_query, fixed_brand, category)

        response = cohere_client.chat(
            model="command-r-plus-08-2024",
            message=prompt,
            max_tokens=800,
            temperature=0.7
        )
        result = response.text
        print(f"✅ Cohere done!")
        return result

    except Exception as e:
        print(f"❌ Cohere error: {e}")
        return f"FAILED: {str(e)}"

# ─────────────────────────────────────────
# ANALYZE BRAND
# ─────────────────────────────────────────

def analyze_brand(
    original_brand: Optional[str],
    fixed_brand: Optional[str],
    response: str
) -> dict:
    if not original_brand and not fixed_brand:
        return {
            "mentioned": None,
            "rank": None,
            "snippet": None,
            "error": False,
            "no_brand": True
        }

    is_failed = (
        response.startswith("FAILED:") or
        response.startswith("RATE_LIMIT:")
    )

    if is_failed:
        return {
            "mentioned": False,
            "rank": None,
            "snippet": None,
            "error": True,
            "no_brand": False
        }

    original_lower = (original_brand or "").lower()
    fixed_lower    = (fixed_brand or "").lower()
    response_lower = response.lower()

    mentioned = (
        (original_lower and original_lower in response_lower) or
        (fixed_lower and fixed_lower in response_lower)
    )

    rank    = None
    snippet = None

    if mentioned:
        lines = response.split('\n')
        for i, line in enumerate(lines):
            line_lower = line.lower()
            if (original_lower and original_lower in line_lower) or \
               (fixed_lower and fixed_lower in line_lower):
                rank    = i + 1
                snippet = line.strip()
                break

    return {
        "mentioned": mentioned,
        "rank": rank,
        "snippet": snippet,
        "error": False,
        "no_brand": False
    }

# ─────────────────────────────────────────
# EXTRACT TOP BRANDS
# ─────────────────────────────────────────

def extract_top_brands(response: str) -> list:
    if response.startswith("FAILED:") or \
       response.startswith("RATE_LIMIT:"):
        return []

    lines  = response.split('\n')
    brands = []

    for line in lines:
        line = line.strip()
        if line and len(line) > 3:
            cleaned = re.sub(r'^[\d\.\-\*\#]+\s*', '', line)
            if cleaned and len(cleaned) > 3:
                brands.append(cleaned[:80])

    return brands[:7]

# ─────────────────────────────────────────
# CALCULATE GRADE
# ─────────────────────────────────────────

def calculate_grade(
    score: float,
    no_brand: bool,
    all_failed: bool
) -> dict:

    if all_failed:
        return {
            "grade": "?",
            "color": "gray",
            "message": "⚠️ AI engines temporarily unavailable",
            "tip": "Please wait 1 minute and try again"
        }

    if no_brand:
        return {
            "grade": "📊",
            "color": "blue",
            "message": "✅ Here are the top brands AI recommends!",
            "tip": "Enter your brand name to get a visibility grade"
        }

    if score == 100:
        return {
            "grade": "A+",
            "color": "green",
            "message": "🏆 Excellent! All 3 AI engines recommend your brand",
            "tip": "Maintain your content strategy and keep getting reviews"
        }
    elif score >= 66:
        return {
            "grade": "B",
            "color": "blue",
            "message": "👍 Good! Mentioned by 2 out of 3 AI engines",
            "tip": "Improve descriptions to appear in more AI results"
        }
    elif score >= 33:
        return {
            "grade": "C",
            "color": "yellow",
            "message": "⚠️ Weak! Only 1 AI engine mentions your brand",
            "tip": "Optimize your listings and get more reviews urgently"
        }
    else:
        return {
            "grade": "F",
            "color": "red",
            "message": "🚨 Critical! No AI engine recommends your brand",
            "tip": "Your brand needs serious AEO optimization"
        }

# ─────────────────────────────────────────
# MAIN ENDPOINT
# ─────────────────────────────────────────

@app.post("/analyze")
async def analyze(request: QueryRequest):
    print(f"\n{'='*60}")
    print(f"📥 Query: {request.query}")
    print(f"📥 Brand: {request.your_brand or 'NOT PROVIDED'}")
    print(f"{'='*60}")

    loop = asyncio.get_event_loop()

    # Step 1: Fix spelling
    understood = await loop.run_in_executor(
        None,
        understand_query,
        request.query,
        request.your_brand
    )

    fixed_query = understood.get("fixed_query", request.query)
    fixed_brand = understood.get("fixed_brand", request.your_brand)
    category    = understood.get("category", "general product")
    intent      = understood.get("search_intent", request.query)

    print(f"🔧 Fixed: {fixed_query} | {fixed_brand or 'no brand'}")

    # Step 2: Query ALL 3 simultaneously
    groq_r, gemini_r, cohere_r = await asyncio.gather(
        loop.run_in_executor(
            None, query_groq,
            fixed_query, fixed_brand, category, intent
        ),
        loop.run_in_executor(
            None, query_gemini,
            fixed_query, fixed_brand, category, intent
        ),
        loop.run_in_executor(
            None, query_cohere,
            fixed_query, fixed_brand, category, intent
        ),
    )

    print(f"✅ All 3 engines done!")

    # Step 3: Analyze
    groq_a   = analyze_brand(request.your_brand, fixed_brand, groq_r)
    gemini_a = analyze_brand(request.your_brand, fixed_brand, gemini_r)
    cohere_a = analyze_brand(request.your_brand, fixed_brand, cohere_r)

    # Step 4: Score
    no_brand = not request.your_brand

    errors = {
        "groq":   groq_a.get("error", False),
        "gemini": gemini_a.get("error", False),
        "cohere": cohere_a.get("error", False),
    }

    all_failed = all(errors.values())
    working    = sum([1 for e in errors.values() if not e])

    if no_brand or all_failed:
        score = 0
    else:
        mentions = sum([
            1 if (not errors["groq"]   and groq_a.get("mentioned"))   else 0,
            1 if (not errors["gemini"] and gemini_a.get("mentioned")) else 0,
            1 if (not errors["cohere"] and cohere_a.get("mentioned")) else 0,
        ])
        score = round((mentions / max(working, 1)) * 100)

    grade_info = calculate_grade(score, no_brand, all_failed)

    print(f"📊 Score: {score}% | Grade: {grade_info['grade']}")
    print(f"📊 Groq:   {'✅' if groq_a.get('mentioned') else '❌'}")
    print(f"📊 Gemini: {'✅' if gemini_a.get('mentioned') else '❌'}")
    print(f"📊 Cohere: {'✅' if cohere_a.get('mentioned') else '❌'}")

    return {
        "query": request.query,
        "your_brand": request.your_brand,
        "fixed_query": fixed_query,
        "fixed_brand": fixed_brand,
        "category": category,
        "search_intent": intent,
        "no_brand": no_brand,
        "overall": {
            "score": score,
            "mentions": f"{score}% visibility" if not no_brand else "Brand not provided",
            **grade_info
        },
        "engines": {
            "Llama 3.3 (Groq)": {
                "response": groq_r if not errors["groq"] else "Temporarily unavailable.",
                "analysis": groq_a,
                "top_brands": extract_top_brands(groq_r),
                "logo": "⚡",
                "status": "error" if errors["groq"] else "ok"
            },
            "Gemini 2.0 Flash": {
                "response": gemini_r if not errors["gemini"] else "Temporarily unavailable.",
                "analysis": gemini_a,
                "top_brands": extract_top_brands(gemini_r),
                "logo": "✨",
                "status": "error" if errors["gemini"] else "ok"
            },
            "Cohere Command-R": {
                "response": cohere_r if not errors["cohere"] else "Temporarily unavailable.",
                "analysis": cohere_a,
                "top_brands": extract_top_brands(cohere_r),
                "logo": "🔥",
                "status": "error" if errors["cohere"] else "ok"
            }
        }
    }

# ─────────────────────────────────────────
# TEST ENDPOINT
# ─────────────────────────────────────────

@app.get("/")
def root():
    return {
        "message": "AEO Diagnostic API is running!",
        "status": "healthy",
        "engines": [
            "Llama 3.3 70B (Groq - Free)",
            "Gemini 2.0 Flash (Google - Free)",
            "Command-R (Cohere - Free)"
        ],
        "brand_required": False
    }
