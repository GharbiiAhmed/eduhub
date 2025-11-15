"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "@/components/navigation"
import { 
  Search, 
  HelpCircle, 
  MessageSquare, 
  BookOpen, 
  Settings, 
  CreditCard, 
  Mail, 
  Phone, 
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Eye,
  ThumbsUp,
  ThumbsDown,
  ArrowLeft
} from "lucide-react"
import { Link } from '@/i18n/routing'
import { useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

interface HelpCategory {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  section: 'website' | 'courses'
  order_index: number
}

interface HelpArticle {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  category_id: string | null
  section: 'website' | 'courses'
  status: 'draft' | 'published' | 'archived'
  view_count: number
  helpful_count: number
  not_helpful_count: number
  help_categories: HelpCategory | null
  help_article_tags?: { tag: string }[]
}

export default function HelpPage() {
  const t = useTranslations('help')
  const tCommon = useTranslations('common')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<'all' | 'website' | 'courses'>('all')
  const [articles, setArticles] = useState<HelpArticle[]>([])
  const [categories, setCategories] = useState<HelpCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null)
  const [userFeedback, setUserFeedback] = useState<Record<string, boolean | null>>({})
  const router = useRouter()

  useEffect(() => {
    fetchCategories()
    fetchArticles()
  }, [selectedSection, selectedCategory])

  const fetchCategories = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedSection !== 'all') {
        params.append('section', selectedSection)
      }
      
      const response = await fetch(`/api/help/categories?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Expected JSON but got:", text.substring(0, 200))
        throw new Error("Response is not JSON")
      }
      
      const data = await response.json()
      if (data.categories) {
        setCategories(data.categories)
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }

  const fetchArticles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (selectedSection !== 'all') {
        params.append('section', selectedSection)
      }
      if (selectedCategory) {
        params.append('categoryId', selectedCategory)
      }
      if (searchTerm) {
        params.append('search', searchTerm)
      }
      
      const response = await fetch(`/api/help/articles?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Expected JSON but got:", text.substring(0, 200))
        throw new Error("Response is not JSON")
      }
      
      const data = await response.json()
      if (data.articles) {
        setArticles(data.articles)
      }
    } catch (error) {
      console.error('Error fetching articles:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm || selectedCategory) {
        fetchArticles()
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchTerm, selectedCategory])

  const handleArticleClick = async (articleId: string) => {
    try {
      const response = await fetch(`/api/help/articles/${articleId}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Expected JSON but got:", text.substring(0, 200))
        throw new Error("Response is not JSON")
      }
      
      const data = await response.json()
      if (data.article) {
        setSelectedArticle(data.article)
      }
    } catch (error) {
      console.error('Error fetching article:', error)
    }
  }

  const handleFeedback = async (articleId: string, isHelpful: boolean) => {
    try {
      const response = await fetch(`/api/help/articles/${articleId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isHelpful })
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text()
        console.error("Expected JSON but got:", text.substring(0, 200))
        throw new Error("Response is not JSON")
      }
      
      const data = await response.json()
      if (data.success) {
        setUserFeedback(prev => ({ ...prev, [articleId]: isHelpful }))
        // Refresh article to get updated counts
        if (selectedArticle?.id === articleId) {
          handleArticleClick(articleId)
        } else {
          fetchArticles()
        }
      }
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }

  const filteredArticles = articles.filter(article => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        article.title.toLowerCase().includes(searchLower) ||
        article.excerpt?.toLowerCase().includes(searchLower) ||
        article.content.toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  // Group categories by section
  const websiteCategories = categories.filter(c => c.section === 'website')
  const coursesCategories = categories.filter(c => c.section === 'courses')

  if (selectedArticle) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 py-8">
            <Button
              variant="ghost"
              onClick={() => setSelectedArticle(null)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToHelpCenter')}
            </Button>
          
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {selectedArticle.help_categories && (
                      <Badge variant="secondary">
                        {selectedArticle.help_categories.name}
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {selectedArticle.section === 'website' ? 'Website' : 'Courses'}
                    </Badge>
                  </div>
                  <CardTitle className="text-3xl mb-2">{selectedArticle.title}</CardTitle>
                  {selectedArticle.excerpt && (
                    <CardDescription className="text-base">
                      {selectedArticle.excerpt}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div 
                className="prose prose-sm max-w-none dark:prose-invert mb-8"
                dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
              />
              
              <div className="border-t pt-6 mt-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{selectedArticle.view_count || 0} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-4 h-4" />
                      <span>{selectedArticle.helpful_count || 0} found helpful</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Was this article helpful?</p>
                  <Button
                    variant={userFeedback[selectedArticle.id] === true ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFeedback(selectedArticle.id, true)}
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    Yes
                  </Button>
                  <Button
                    variant={userFeedback[selectedArticle.id] === false ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFeedback(selectedArticle.id, false)}
                  >
                    <ThumbsDown className="w-4 h-4 mr-1" />
                    No
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {t('title')}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section Tabs */}
          <div className="flex items-center gap-2 border-b">
            <Button
              variant={selectedSection === 'all' ? 'default' : 'ghost'}
              onClick={() => setSelectedSection('all')}
            >
              {t('allArticles')}
            </Button>
            <Button
              variant={selectedSection === 'website' ? 'default' : 'ghost'}
              onClick={() => setSelectedSection('website')}
            >
              {t('websiteHelp')}
            </Button>
            <Button
              variant={selectedSection === 'courses' ? 'default' : 'ghost'}
              onClick={() => setSelectedSection('courses')}
            >
              {t('coursesHelp')}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Categories Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <HelpCircle className="w-5 h-5 mr-2 text-blue-600" />
                    {t('browseByCategory')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button
                      variant={selectedCategory === null ? 'default' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => setSelectedCategory(null)}
                    >
                      {t('allCategories')}
                    </Button>
                    
                    {selectedSection === 'all' || selectedSection === 'website' ? (
                      <>
                        <div className="pt-2 pb-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase">{t('website')}</p>
                        </div>
                        {websiteCategories.map((category) => (
                          <Button
                            key={category.id}
                            variant={selectedCategory === category.id ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setSelectedCategory(category.id)}
                          >
                            {category.name}
                          </Button>
                        ))}
                      </>
                    ) : null}
                    
                    {selectedSection === 'all' || selectedSection === 'courses' ? (
                      <>
                        <div className="pt-2 pb-1">
                          <p className="text-xs font-semibold text-gray-500 uppercase">{t('courses')}</p>
                        </div>
                        {coursesCategories.map((category) => (
                          <Button
                            key={category.id}
                            variant={selectedCategory === category.id ? 'default' : 'ghost'}
                            className="w-full justify-start"
                            onClick={() => setSelectedCategory(category.id)}
                          >
                            {category.name}
                          </Button>
                        ))}
                      </>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-green-600" />
                    {t('contactUs')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-sm">{t('emailSupport')}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">support@eduhub.com</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-sm">{t('phoneSupport')}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">+1 (555) 123-4567</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-gray-500" />
                    <div>
                      <p className="font-medium text-sm">{t('supportHours')}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('supportHoursTime')}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {loading ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-gray-600 dark:text-gray-400">{t('loadingArticles')}</p>
                  </CardContent>
                </Card>
              ) : filteredArticles.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{t('noArticles')}</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {searchTerm ? t('tryAdjustingSearch') : t('noArticlesInCategory')}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredArticles.map((article) => (
                    <Card key={article.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {article.help_categories && (
                                <Badge variant="secondary">
                                  {article.help_categories.name}
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {article.section === 'website' ? 'Website' : 'Courses'}
                              </Badge>
                            </div>
                            <h3 
                              className="font-semibold text-lg text-gray-900 dark:text-white mb-2 hover:text-primary transition-colors"
                              onClick={() => handleArticleClick(article.id)}
                            >
                              {article.title}
                            </h3>
                            {article.excerpt && (
                              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                                {article.excerpt}
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                <span>{article.view_count || 0} views</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ThumbsUp className="w-3 h-3" />
                                <span>{article.helpful_count || 0} helpful</span>
                              </div>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleArticleClick(article.id)}
                          >
                            Read More
                            <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
