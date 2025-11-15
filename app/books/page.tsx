"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import Link from "next/link"
import { 
  BookOpen, 
  Search, 
  Filter, 
  Grid, 
  List,
  Download,
  Eye,
  Star,
  Clock,
  User,
  ChevronDown,
  ShoppingCart,
  Heart,
  Share2,
  Award,
  Zap
} from "lucide-react"
import { Navigation } from "@/components/navigation"
import { FeatureGuard } from "@/components/feature-guard"

interface Book {
  id: string
  title: string
  author: string
  description: string
  cover_url: string | null
  price: number
  physical_available: boolean
  digital_available: boolean
  pdf_url: string | null
  created_at: string
  purchases_count?: number
}

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [filterType, setFilterType] = useState('all')
  const [filterPrice, setFilterPrice] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showFilters, setShowFilters] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    fetchBooks()
  }, [])

  useEffect(() => {
    filterBooks()
  }, [books, searchTerm, sortBy, filterType, filterPrice])

  const fetchBooks = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error('Error fetching books:', error)
        throw error
      }

      console.log('Fetched books:', data?.length || 0, 'books')

      // Get purchase counts for each book
      const booksWithData = await Promise.all(
        (data || []).map(async (book) => {
          const { count } = await supabase
            .from("book_purchases")
            .select("*", { count: "exact", head: true })
            .eq("book_id", book.id)

          return {
            ...book,
            purchases_count: count || 0
          }
        })
      )

      console.log('Books with data:', booksWithData.length)
      setBooks(booksWithData)
    } catch (error) {
      console.error('Error fetching books:', error)
      // Set empty array on error so UI doesn't break
      setBooks([])
    } finally {
      setLoading(false)
    }
  }

  const filterBooks = () => {
    console.log('Filtering books:', books.length, 'total books')
    let filtered = [...books]

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      console.log('After search filter:', filtered.length)
    }

    // Category filter removed - no category field in database

    // Type filter
    if (filterType !== 'all') {
      if (filterType === 'physical') {
        filtered = filtered.filter(book => book.physical_available)
      } else if (filterType === 'digital') {
        filtered = filtered.filter(book => book.digital_available)
      }
      console.log('After type filter:', filtered.length)
    }

    // Price filter
    if (filterPrice !== 'all') {
      if (filterPrice === 'free') {
        filtered = filtered.filter(book => book.price === 0)
      } else if (filterPrice === 'paid') {
        filtered = filtered.filter(book => book.price > 0)
      } else if (filterPrice === 'under20') {
        filtered = filtered.filter(book => book.price > 0 && book.price < 20)
      } else if (filterPrice === 'over20') {
        filtered = filtered.filter(book => book.price >= 20)
      }
      console.log('After price filter:', filtered.length)
    }

    // Sort
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        break
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        break
      case 'price_low':
        filtered.sort((a, b) => a.price - b.price)
        break
      case 'price_high':
        filtered.sort((a, b) => b.price - a.price)
        break
      case 'popular':
        filtered.sort((a, b) => (b.purchases_count || 0) - (a.purchases_count || 0))
        break
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title))
        break
    }

    console.log('Final filtered books:', filtered.length)
    setFilteredBooks(filtered)
  }


  if (loading) {
    return (
      <FeatureGuard feature="books">
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <Navigation />
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </FeatureGuard>
    )
  }

  return (
    <FeatureGuard feature="books">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 p-8 md:p-12 mb-8">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
      <div>
                <h1 className="text-4xl md:text-5xl font-bold text-white">
                  Digital Library
                </h1>
                <p className="text-white/90 text-lg mt-2">
                  Discover amazing books from expert authors and publishers
                </p>
              </div>
      </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-6 h-6 text-white" />
                  <div>
                    <div className="text-2xl font-bold text-white">{books.length}+</div>
                    <div className="text-white/80 text-sm">Books Available</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Download className="w-6 h-6 text-white" />
                  <div>
                    <div className="text-2xl font-bold text-white">5K+</div>
                    <div className="text-white/80 text-sm">Downloads</div>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center space-x-3">
                  <Star className="w-6 h-6 text-white" />
                  <div>
                    <div className="text-2xl font-bold text-white">4.7</div>
                    <div className="text-white/80 text-sm">Average Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-8 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="Search books, authors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price_low">Price: Low to High</SelectItem>
                <SelectItem value="price_high">Price: High to Low</SelectItem>
                <SelectItem value="popular">Most Popular</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode */}
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Advanced Filters Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type
                  </label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="physical">Physical Books</SelectItem>
                      <SelectItem value="digital">Digital Books</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Price
                  </label>
                  <Select value={filterPrice} onValueChange={setFilterPrice}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Prices" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Prices</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="under20">Under $20</SelectItem>
                      <SelectItem value="over20">$20 and above</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-600 dark:text-gray-400">
            Showing {filteredBooks.length} of {books.length} books
          </div>
          <div className="flex items-center space-x-2">
            {searchTerm && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Search: "{searchTerm}"</span>
                <button
                  onClick={() => setSearchTerm('')}
                  className="ml-1 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        </div>

        {/* Books Grid/List */}
        {filteredBooks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No books found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your search terms or filters
            </p>
            <Button onClick={() => {
              setSearchTerm('')
              setFilterType('all')
              setFilterPrice('all')
            }}>
              Clear Filters
            </Button>
        </div>
      ) : (
          <div className={viewMode === 'grid' 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
            : "space-y-4"
          }>
            {filteredBooks.map((book) => (
              <BookCard key={book.id} book={book} viewMode={viewMode} />
            ))}
          </div>
        )}
        </div>
      </div>
    </FeatureGuard>
  )
}

function BookCard({ book, viewMode }: { book: Book; viewMode: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-lg transition-shadow">
        <div className="flex">
          <div className="w-32 h-48 bg-gradient-to-br from-green-500 to-emerald-600 rounded-l-lg flex items-center justify-center">
            {book.cover_url ? (
              <img
                src={book.cover_url}
                alt={book.title}
                className="w-full h-full object-cover rounded-l-lg"
              />
            ) : (
              <BookOpen className="w-12 h-12 text-white" />
            )}
          </div>
          <div className="flex-1 p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {book.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-2">by {book.author}</p>
                <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {book.description}
                </p>
                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{book.purchases_count || 0} purchases</span>
                  </div>
                </div>
              </div>
              <div className="ml-6 text-right">
                <div className="text-2xl font-bold text-green-600 mb-2">
                  {book.price === 0 ? 'Free' : `$${book.price}`}
                </div>
                <div className="flex space-x-2">
                  <Button asChild>
                    <Link href={`/books/${book.id}`}>
                      View Details
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm">
                    <Heart className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105">
      <div className="relative">
        <div className="h-64 bg-gradient-to-br from-green-500 to-emerald-600 rounded-t-lg overflow-hidden">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-16 h-16 text-white" />
            </div>
          )}
        </div>
        <div className="absolute top-3 right-3 flex space-x-1">
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 bg-white/90 hover:bg-white">
            <Heart className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 bg-white/90 hover:bg-white">
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {book.title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">by {book.author}</p>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
          {book.description}
        </p>

                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{book.purchases_count || 0} purchases</span>
                  </div>
                </div>

        <div className="flex items-center justify-between mb-4">
          <div className="text-2xl font-bold text-green-600">
            {book.price === 0 ? 'Free' : `$${book.price}`}
          </div>
          <div className="flex space-x-1">
            {book.physical_available && (
              <Badge variant="secondary" className="text-xs">Physical</Badge>
            )}
            {book.digital_available && (
              <Badge variant="secondary" className="text-xs">PDF</Badge>
            )}
          </div>
        </div>

        <Button asChild className="w-full">
          <Link href={`/books/${book.id}`}>
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}