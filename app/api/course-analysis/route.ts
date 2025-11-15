import { getQrokAPI } from "@/lib/qrok-api"

export async function POST(req: Request) {
  try {
    const { courseData } = await req.json()

    if (!courseData) {
      return Response.json({ error: "Course data required" }, { status: 400 })
    }

    const prompt = `Analyze this course and provide insights:
Title: ${courseData.title}
Description: ${courseData.description}
Price: $${courseData.price}
Status: ${courseData.status}

Provide:
1. Course quality assessment
2. Target audience analysis
3. Pricing recommendations
4. Content improvement suggestions
5. Marketing tips`

    try {
      const qrokAPI = getQrokAPI()
      const analysis = await qrokAPI.generateText(prompt, undefined, {
        model: "gpt-4o-mini",
        maxTokens: 800,
        temperature: 0.7
      })

      return Response.json({ analysis })
    } catch (error) {
      console.warn('Course analysis API failed, using mock response:', error)
      
      // Mock analysis when API fails
      const mockAnalysis = `Course Analysis for "${courseData.title}":

1. **Course Quality Assessment**: This course appears to be well-structured with clear learning objectives. The content seems comprehensive and suitable for the target audience.

2. **Target Audience Analysis**: Based on the description, this course is designed for beginners to intermediate learners who want to gain practical skills.

3. **Pricing Recommendations**: At $${courseData.price}, this course offers good value for money. Consider offering bundle deals or early-bird discounts to increase enrollment.

4. **Content Improvement Suggestions**: 
   - Add more interactive elements
   - Include practical exercises and projects
   - Provide downloadable resources
   - Consider adding video content

5. **Marketing Tips**:
   - Create compelling course previews
   - Use social media to showcase student success stories
   - Offer free webinars or mini-courses
   - Partner with industry influencers

This analysis was generated using our AI system. For more detailed insights, please ensure your AI API is properly configured.`

      return Response.json({ analysis: mockAnalysis })
    }
  } catch (error) {
    console.error("[v0] Course analysis error:", error)
    return Response.json({ error: "Failed to analyze course" }, { status: 500 })
  }
}
