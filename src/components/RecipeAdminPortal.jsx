import React, { useState, useEffect } from 'react';
import { 
  // All necessary icons for the application
  Search, Plus, Edit2, Trash2, Eye, Download, RefreshCw, XCircle, CheckCircle, 
  ChevronLeft, ChevronRight, LayoutDashboard, Utensils, BookOpen, PieChart, 
  List, Clock, Zap, Database, Globe, X, Image, CookingPot, Users, Gauge, Dot, 
  ListOrdered 
} from 'lucide-react';
//Backend integration
const BASE_URL = process.env.REACT_APP_API_BASE_URL;

const RecipeAdminPortal = () => {
  const [recipes, setRecipes] = useState([]); 
  const [pagedRecipes, setPagedRecipes] = useState([]); 
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [recipesPerPage] = useState(20);
  const [totalRecipesCount, setTotalRecipesCount] = useState(0); 
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const getSourceBadge = (source) => { // <-- FIX for Line 438
    const normalizedSource = source === 'cookbook' ? 'Database' : source.charAt(0).toUpperCase() + source.slice(1);
    const isDatabase = normalizedSource === 'Database';
    const classes = `px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
        isDatabase ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-purple-100 text-purple-700 border border-purple-200'
    }`;
    const Icon = isDatabase ? Database : Zap; // NOTE: 'Database' and 'Zap' icons must also be imported
    return <span className={classes}><Icon size={12} /> {normalizedSource}</span>;
};
  
  const [stats, setStats] = useState({
    total: 0,
    dbRecipes: 0,
    apiRecipes: 0,
    categories: 0
  });

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    ingredients: '',
    instructions: '',
    prepTime: '',
    cookTime: '',
    servings: '',
    difficulty: 'Medium',
    image: '',
    source: 'database'
  });

  useEffect(() => {
    if (currentView === 'recipes') {
      fetchPagedRecipes();
    }
    fetchRecipesForStats();
  }, [currentView, currentPage, searchQuery, filterCategory]);

  const fetchPagedRecipes = async () => {
    setIsLoading(true);
    console.log('=== fetchPagedRecipes called ===');
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: recipesPerPage,
        search: searchQuery || '',
        category: filterCategory || 'all',
      });

      const url = `${BASE_URL}/api/recipes?${params.toString()}`;
      console.log('Fetching URL:', url);

      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch paged recipes: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      console.log('First recipe raw:', data.recipes[0]);
      console.log('All fields in first recipe:', Object.keys(data.recipes[0] || {}));

      if (!data.recipes || !Array.isArray(data.recipes)) {
        console.error('Unexpected response format:', data);
        throw new Error('Invalid response format from server');
      }

      const normalized = data.recipes.map(r => {
        const norm = { 
          ...r, 
          id: r._id || r.id,
          name: r.title || r.name || r.recipe_name || r.recipeName,
          title: r.title || r.name || r.recipe_name || r.recipeName
        };
        console.log('Normalizing recipe:', { 
          rawFields: Object.keys(r),
          originalTitle: r.title, 
          originalName: r.name,
          normalized: norm.name 
        });
        return norm;
      });
      console.log('Normalized recipes:', normalized.length);
      console.log('First normalized recipe:', normalized[0]);
      
      setPagedRecipes(normalized);
      setTotalRecipesCount(data.totalCount);
    } catch (error) {
      console.error('Error in fetchPagedRecipes:', error);
      setPagedRecipes([]);
      setTotalRecipesCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecipesForStats = async () => {
    console.log('=== fetchRecipesForStats called ===');
    try {
      const url = `${BASE_URL}/api/recipes/stats`;
      console.log('Fetching stats from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats recipes');
      }
      
      const data = await response.json();
      console.log('Stats data received:', data.length, 'recipes');
      
      if (!Array.isArray(data)) {
        console.error('Expected array, got:', typeof data);
        throw new Error('Invalid stats response format');
      }
      
      const normalized = data.map(r => ({ 
        ...r, 
        id: r._id,
        name: r.title || r.name,
        title: r.title || r.name
      }));
      setRecipes(normalized);
      calculateStats(normalized);
    } catch (error) {
      console.error("Error fetching stats data:", error);
      setRecipes([]);
      setStats({
        total: 0,
        dbRecipes: 0,
        apiRecipes: 0,
        categories: 0
      });
    }
  };

  const calculateStats = (data) => {
    const categories = [...new Set(data.map(r => r.category))];
    setStats({
      total: data.length,
      dbRecipes: data.filter(r => r.source === 'database' || r.source === 'cookbook').length,
      apiRecipes: data.filter(r => r.source === 'api').length,
      categories: categories.length
    });
  };

  const showNotification = (message, type) => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };
  
  const totalPages = Math.ceil(totalRecipesCount / recipesPerPage);

  const handleNextPage = () => {
    setCurrentPage(prev => (prev < totalPages ? prev + 1 : prev));
  };

  const handlePrevPage = () => {
    setCurrentPage(prev => (prev > 1 ? prev - 1 : prev));
  };
  
  const handleFilterChange = (setter, value) => {
    setter(value);
    setCurrentPage(1);
  };

  const handleAddRecipe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/recipes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to add recipe');
      
      await fetchPagedRecipes();
      await fetchRecipesForStats();
      resetForm();
      setCurrentView('recipes');
      showNotification('Recipe added successfully', 'success');
    } catch (error) {
      console.error('Error adding recipe:', error);
      showNotification('Failed to add recipe', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRecipe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/recipes/${selectedRecipe.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) throw new Error('Failed to update recipe');
      
      await fetchPagedRecipes();
      await fetchRecipesForStats();
      resetForm();
      setCurrentView('recipes');
      showNotification('Recipe updated successfully', 'success');
    } catch (error) {
      console.error('Error updating recipe:', error);
      showNotification('Failed to update recipe', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecipe = async (id) => {
    if (!window.confirm('Are you sure you want to delete this recipe?')) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/recipes/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete recipe');
      
      await fetchPagedRecipes();
      await fetchRecipesForStats();
      showNotification('Recipe deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      showNotification('Failed to delete recipe', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (recipe) => {
    console.log('=== Editing Recipe ===');
    console.log('Recipe data:', recipe);
    
    // Normalize the recipe object
    const normalizedRecipe = {
      ...recipe,
      name: recipe.name || recipe.title,
      title: recipe.title || recipe.name
    };
    
    // If ingredients or instructions are missing, fetch full recipe details
    let fullRecipe = normalizedRecipe;
    if (!normalizedRecipe.ingredients || !normalizedRecipe.instructions) {
      console.log('Fetching full recipe details for edit...');
      try {
        const response = await fetch(`${BASE_URL}/api/recipes/${recipe.id}`);
        if (response.ok) {
          const fetchedRecipe = await response.json();
          fullRecipe = {
            ...fetchedRecipe,
            id: fetchedRecipe._id || fetchedRecipe.id,
            name: fetchedRecipe.name || fetchedRecipe.title,
            title: fetchedRecipe.title || fetchedRecipe.name
          };
          console.log('Full recipe fetched for edit:', fullRecipe);
        }
      } catch (error) {
        console.error('Error fetching full recipe for edit:', error);
      }
    }
    
    setSelectedRecipe(fullRecipe);
    setFormData({ 
      ...fullRecipe,
      name: fullRecipe.name || fullRecipe.title,
      ingredients: Array.isArray(fullRecipe.ingredients) 
        ? fullRecipe.ingredients.join(', ') 
        : fullRecipe.ingredients || ''
    });
    setCurrentView('edit');
  };

  const handleView = async (recipe) => {
  console.log('=== Viewing Recipe ===');

  const normalizedRecipe = {
    ...recipe,
    name: recipe.name || recipe.title,
    title: recipe.title || recipe.name
  };
  
  if (!normalizedRecipe.ingredients || !normalizedRecipe.instructions) {
    try {
      const response = await fetch(`${BASE_URL}/api/recipes/${recipe.id}`);
      if (response.ok) {
        const fullRecipe = await response.json();
        const normalized = {
          ...fullRecipe,
          id: fullRecipe._id || fullRecipe.id,
          name: fullRecipe.name || fullRecipe.title,
          title: fullRecipe.title || fullRecipe.name
        };
        
        setSelectedRecipe(normalized);
        setCurrentView('view');

        // 🔥 FIX: Update recent recipes on dashboard
        await fetchRecipesForStats();

        return;
      }
    } catch (error) {
      console.error('Error fetching full recipe:', error);
    }
  }

  setSelectedRecipe(normalizedRecipe);
  setCurrentView('view');

  // 🔥 FIX: Update recent recipes on dashboard
  await fetchRecipesForStats();
};


  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      ingredients: '',
      instructions: '',
      prepTime: '',
      cookTime: '',
      servings: '',
      difficulty: 'Medium',
      image: '',
      source: 'database'
    });
    setSelectedRecipe(null);
  };

  const exportData = () => {
    const dataStr = JSON.stringify(recipes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'recipes_export.json';
    link.click();
    showNotification('Data exported successfully', 'success');
  };

  const categories = [...new Set(recipes.map(r => r.category))];

  return (
    <div className="min-h-screen bg-gray-50">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          {notification.message}
        </div>
      )}
<header className="bg-white shadow-xl border-b border-gray-100 sticky top-0 z-10">
  <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
    
    {/* 🍱 LOGO/BRANDING SECTION - Now acts as the primary navigation anchor/Home */}
    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('recipes')}>
      <Utensils size={32} className="text-pink-600" /> 
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          Recipe Admin Portal
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your recipe data and API integrations</p>
      </div>
    </div>
    
    {/* 🚀 UTILITY ACTIONS */}
    <div className="flex items-center gap-4">
      
      {/* Utility: Refresh Data */}
      <button 
        onClick={() => { fetchPagedRecipes(); fetchRecipesForStats(); }} 
        className="px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition duration-150 flex items-center gap-2 border border-gray-200"
        title="Refresh All Data"
      >
        <RefreshCw size={18} />
      </button>
      
      {/* Utility: Export Data - Primary action style maintained */}
      <button 
        onClick={exportData} 
        className="px-3 py-2 bg-gray-700 text-white font-medium rounded-lg hover:bg-gray-800 transition duration-150 flex items-center gap-2 shadow-md"
        title="Export Data"
      >
        <Download size={18} /> Export
      </button>
    </div>
  </div>
</header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <nav className="flex gap-2 mb-6">
          <button
            onClick={() => setCurrentView('dashboard')}
            className={`px-4 py-2 rounded-lg font-medium ${
              currentView === 'dashboard' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => { 
              setCurrentView('recipes'); 
              setCurrentPage(1);
            }}
            className={`px-4 py-2 rounded-lg font-medium ${
              currentView === 'recipes' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            All Recipes
          </button>
          <button
            onClick={() => { resetForm(); setCurrentView('add'); }}
            className={`px-4 py-2 rounded-lg font-medium ${
              currentView === 'add' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Plus size={16} className="inline mr-2" />
            Add Recipe
          </button>
        </nav>
{currentView === 'dashboard' && (
  // Use a main container with proper padding and background for the dashboard view
  <div className="p-6 bg-gray-50 min-h-screen">
    <h1 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-2">
        <LayoutDashboard size={28} className="text-indigo-600" /> Dashboard Overview
    </h1>

    {/* MAIN CONTENT GRID (2 COLUMNS on desktop) */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

      {/* COLUMN 1: RECIPE SUMMARY STATS (1/3 width on large screens) */}
      <div className="lg:col-span-1 space-y-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <PieChart size={20} className="text-indigo-500"/> Performance Metrics
        </h2>
        
        {/* RECIPE SUMMARY CARDS - Redesigned for better impact */}
        <div className="space-y-4">
            
            {/* Avg Cook Time */}
            <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-yellow-500 flex items-center justify-between">
                <div>
                    <div className="text-sm font-medium text-gray-500">Avg Cook Time</div>
                    <div className="text-3xl font-bold text-gray-900 mt-1">
                        {/* Using optional chaining for safety */}
                        {stats?.timeBreakdown?.avgCook || 'N/A'}
                    </div>
                </div>
                <Clock size={32} className="text-yellow-400 opacity-70" />
            </div>

            {/* Database Count */}
            <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-green-500 flex items-center justify-between">
                <div>
                    <div className="text-sm font-medium text-gray-500">Database Count</div>
                    <div className="text-3xl font-bold text-gray-900 mt-1">
                        {stats?.dbRecipes || 0}
                    </div>
                </div>
                <Database size={32} className="text-green-400 opacity-70" />
            </div>

            {/* API Count */}
            <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-purple-500 flex items-center justify-between">
                <div>
                    <div className="text-sm font-medium text-gray-500">API Count</div>
                    <div className="text-3xl font-bold text-gray-900 mt-1">
                        {stats?.apiRecipes || 0}
                    </div>
                </div>
                <Globe size={32} className="text-purple-400 opacity-70" />
            </div>
        </div>
      </div>


      {/* COLUMN 2: RECENT RECIPES LIST (2/3 width on large screens) */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-2xl p-6 border border-gray-100">
          
          {/* MODIFIED HEADER: The "View All" button is removed from the div below */}
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
              <List size={24} className="text-indigo-600" /> Recent Recipes
            </h2>
            {/* The "View All" button previously here is now removed. */}
          </div>

          <div className="space-y-4">
            {recipes.slice(0, 5).length > 0 ? (
              recipes.slice(0, 5).map(recipe => (
                <div 
                  key={recipe.id} 
                  className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:bg-indigo-50 hover:shadow-lg transition duration-200 cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                      <Utensils size={20} className="text-indigo-400" />
                      <div>
                        <div className="font-semibold text-gray-800">{recipe.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                            {recipe.category || 'Uncategorized'}
                        </div>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {getSourceBadge(recipe.source || 'database')} 
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleView(recipe); }} 
                        className="text-indigo-600 hover:text-indigo-800 p-2 rounded-full transition bg-indigo-100/50 hover:bg-indigo-100" 
                        title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed">
                  <BookOpen size={24} className="mx-auto mb-2 text-gray-400" />
                  No recent recipes available. Start by adding a new recipe!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
)}

        {currentView === 'recipes' && (
  // Use a softer, consistent background
  <div className="p-8 bg-gray-50 min-h-screen-minus-header">
    <h1 className="text-4xl font-extrabold text-gray-900 mb-8 tracking-tight">
        Recipe Catalog
    </h1>

    {/* HEADER BAR: Search and Add Button */}
    <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-5 mb-8 flex flex-col md:flex-row gap-4 items-center">
      <div className="flex-1 relative w-full md:w-auto">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search recipes by name..."
          value={searchQuery}
          onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
          // Refined focus ring and border color
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-200 shadow-sm"
        />
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={() => setCurrentView('add')}
          // Used a slightly brighter, primary action color (e.g., Pink/Rose)
          className="px-5 py-2.5 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 transition duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl"
        >
          <Plus size={20} /> Add New Recipe
        </button>
      </div>
    </div>
    
    {/* RECIPES TABLE CONTAINER */}
    <div className="bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden">
      {isLoading ? (
        <div className="text-center p-16 text-xl text-indigo-500 flex items-center justify-center gap-3">
            <RefreshCw size={24} className="animate-spin text-pink-500" /> Loading recipes, please wait...
        </div>
      ) : pagedRecipes.length === 0 ? (
        <div className="text-center p-16 text-lg text-gray-500">
            <BookOpen size={40} className="mx-auto mb-4 text-gray-400" />
            <p className="font-medium">No recipes found matching your criteria.</p>
            <p className="text-sm mt-1">Try adjusting your search terms or adding a new recipe.</p>
        </div>
      ) : (
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Difficulty</th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider hidden sm:table-cell">Source</th>
              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {pagedRecipes.map(recipe => {
              return (
                <tr key={recipe.id} className="hover:bg-pink-50 transition duration-150">
                  <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{recipe.name || recipe.title || 'Untitled'}</td>
                  
                  {/* Difficulty Badge - Improved contrast and readability */}
                  <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      recipe.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                      recipe.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                      'bg-red-100 text-red-700 border border-red-300'
                    }`}>
                      {recipe.difficulty}
                    </span>
                  </td>
                  
                  {/* Source Badge - Using a cohesive Indigo/Pink palette for database */}
                  <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      recipe.source === 'database' || recipe.source === 'cookbook' ? 'bg-indigo-100 text-indigo-700 border border-indigo-300' : 'bg-purple-100 text-purple-700 border border-purple-300'
                    }`}>
                      {recipe.source === 'cookbook' ? 'Database' : recipe.source.toUpperCase()}
                    </span>
                  </td>
                  
                  {/* Actions - Cleaner hover states */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => handleView(recipe)} className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition duration-150" title="View Details">
                        <Eye size={18} />
                      </button>
                      <button onClick={() => handleEdit(recipe)} className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-50 transition duration-150" title="Edit Recipe">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDeleteRecipe(recipe.id)} className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition duration-150" title="Delete Recipe">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
    
    {/* PAGINATION BLOCK - Refined Look */}
    {pagedRecipes.length > 0 && (
      <div className="flex justify-between items-center bg-white p-5 mt-8 rounded-xl shadow-xl border border-gray-100">
        <div className="text-base text-gray-600">
          Showing <span className="font-bold text-gray-800">{((currentPage - 1) * recipesPerPage) + 1}</span> to <span className="font-bold text-gray-800">{Math.min(currentPage * recipesPerPage, totalRecipesCount)}</span> of <span className="font-bold text-gray-800">{totalRecipesCount}</span> total recipes
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1 || isLoading}
            // Cleaner, less obtrusive pagination buttons
            className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-1 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span className="px-4 py-2 font-bold bg-pink-600 text-white rounded-lg shadow-md">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || isLoading}
            className="px-4 py-2 border border-gray-300 rounded-lg flex items-center gap-1 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      </div>
    )}
  </div>
)}

        {(currentView === 'add' || currentView === 'edit') && (
  // Use a soft background for the page container
  <div className="p-8 bg-gray-50 min-h-screen-minus-header">
    
    <div className="bg-white rounded-xl shadow-2xl border border-gray-100 p-8 max-w-4xl mx-auto">
      
      {/* HEADER SECTION */}
      <h2 className="text-3xl font-bold text-gray-800 mb-8 flex items-center gap-3 border-b pb-4">
        {currentView === 'add' ? (
          <Plus size={28} className="text-pink-600" />
        ) : (
          <Edit2 size={28} className="text-pink-600" />
        )}
        {currentView === 'add' ? 'Add New Recipe' : `Edit Recipe: ${formData.name || 'Untitled'}`}
      </h2>
      
      {/* FORM FIELDS CONTAINER */}
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* 1. Recipe Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Recipe Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150"
            />
          </div>
          
          {/* 2. Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Category <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150"
            />
          </div>
          
          {/* 3. Prep Time */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Prep Time (minutes) <span className="text-red-500">*</span></label>
            <input
              type="number"
              required
              value={formData.prepTime}
              onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150"
            />
          </div>
          
          {/* 4. Cook Time */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Cook Time (minutes) <span className="text-red-500">*</span></label>
            <input
              type="number"
              required
              value={formData.cookTime}
              onChange={(e) => setFormData({ ...formData, cookTime: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150"
            />
          </div>
          
          {/* 5. Servings */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Servings <span className="text-red-500">*</span></label>
            <input
              type="number"
              required
              value={formData.servings}
              onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150"
            />
          </div>
          
          {/* 6. Difficulty */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty <span className="text-red-500">*</span></label>
            <select
              required
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150 bg-white appearance-none"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          
          {/* 7. Source */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Source <span className="text-red-500">*</span></label>
            <select
              required
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150 bg-white appearance-none"
            >
              <option value="database">Database</option>
              <option value="api">API</option>
            </select>
          </div>
          
          {/* 8. Image URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Image URL (Optional)</label>
            <input
              type="text"
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150"
            />
          </div>
          
          {/* 9. Ingredients (Full Width) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Ingredients <span className="text-red-500">*</span> (comma-separated)</label>
            <textarea
              required
              value={formData.ingredients}
              onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
              rows="3"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150"
            />
          </div>
          
          {/* 10. Instructions (Full Width) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Instructions <span className="text-red-500">*</span></label>
            <textarea
              required
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              rows="5"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150"
            />
          </div>
          
        </div>
      </div>
      
      {/* ACTION BUTTONS */}
      <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={currentView === 'add' ? handleAddRecipe : handleUpdateRecipe}
          disabled={isLoading}
          // Primary action button using Pink
          className="px-8 py-3 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center gap-2"
        >
          {isLoading ? 'Saving...' : (currentView === 'add' ? (<><CheckCircle size={20} /> Add Recipe</>) : (<><CheckCircle size={20} /> Update Recipe</>))}
        </button>
        <button
          onClick={() => { resetForm(); setCurrentView('recipes'); }}
          // Secondary action button (Cancel)
          className="px-8 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition duration-150 flex items-center gap-2 shadow-md"
        >
          <XCircle size={20} /> Cancel
        </button>
      </div>
    </div>
  </div>
)}
       {currentView === 'view' && selectedRecipe && (
  // Use a soft background for the page container
  <div className="p-8 bg-gray-50 min-h-screen-minus-header">
    
    <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-5xl mx-auto overflow-hidden">
      
      {/* RECIPE IMAGE SECTION */}
      {selectedRecipe.image ? (
        <div className="h-80 w-full bg-gray-200 overflow-hidden">
          <img 
            src={selectedRecipe.image} 
            alt={selectedRecipe.name || 'Recipe Image'} 
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]" 
          />
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center bg-gray-100 text-gray-400">
          <Image size={48} />
          <span className="ml-3 text-lg font-medium">No Image Available</span>
        </div>
      )}

      {/* RECIPE CONTENT & DETAILS */}
      <div className="p-8">
        
        {/* HEADER & CLOSE BUTTON */}
        <div className="flex justify-between items-start mb-6 border-b pb-4">
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            {selectedRecipe.name || 'Untitled Recipe'}
          </h2>
          <button
            onClick={() => setCurrentView('recipes')}
            className="text-gray-400 hover:text-pink-600 p-2 rounded-full transition duration-150"
            title="Close View"
          >
            <X size={28} />
          </button>
        </div>
        
        {/* METADATA STRIP (Prep, Cook, Servings, Difficulty) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          
          {/* Prep Time */}
          <div className="bg-white border border-pink-100 p-4 rounded-xl shadow-md flex items-center">
            <Clock size={24} className="text-pink-600 mr-3" />
            <div>
              <div className="text-xs uppercase text-pink-600 font-bold">Prep Time</div>
              <div className="text-xl font-bold text-gray-800">{selectedRecipe.prepTime || 'N/A'} <span className="text-base font-medium text-gray-600">min</span></div>
            </div>
          </div>
          
          {/* Cook Time */}
          <div className="bg-white border border-pink-100 p-4 rounded-xl shadow-md flex items-center">
            <CookingPot size={24} className="text-pink-600 mr-3" />
            <div>
              <div className="text-xs uppercase text-pink-600 font-bold">Cook Time</div>
              <div className="text-xl font-bold text-gray-800">{selectedRecipe.cookTime || 'N/A'} <span className="text-base font-medium text-gray-600">min</span></div>
            </div>
          </div>
          
          {/* Servings */}
          <div className="bg-white border border-pink-100 p-4 rounded-xl shadow-md flex items-center">
            <Users size={24} className="text-pink-600 mr-3" />
            <div>
              <div className="text-xs uppercase text-pink-600 font-bold">Servings</div>
              <div className="text-xl font-bold text-gray-800">{selectedRecipe.servings || 'N/A'}</div>
            </div>
          </div>
          
          {/* Difficulty (Badge style for consistency) */}
          <div className="bg-white border border-pink-100 p-4 rounded-xl shadow-md flex items-center">
            <Gauge size={24} className="text-pink-600 mr-3" />
            <div>
              <div className="text-xs uppercase text-pink-600 font-bold">Difficulty</div>
              <span className={`mt-0.5 inline-block px-3 py-1 text-xs font-bold rounded-full ${
                selectedRecipe.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
                selectedRecipe.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700' :
                'bg-red-100 text-red-700'
              }`}>
                {selectedRecipe.difficulty || 'N/A'}
              </span>
            </div>
          </div>
        </div>
        
        {/* INGREDIENTS SECTION */}
        <div className="mb-10 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-extrabold text-2xl text-gray-800 mb-4 flex items-center gap-2">
            <Utensils size={24} className="text-pink-600" /> Ingredients
          </h3>
          {(() => {
            try {
              let ingredientsList = [];
              // Logic to handle different ingredient formats (string/array/object)
              if (Array.isArray(selectedRecipe.ingredients)) {
                ingredientsList = selectedRecipe.ingredients;
              } else if (typeof selectedRecipe.ingredients === 'string' && selectedRecipe.ingredients.trim()) {
                ingredientsList = selectedRecipe.ingredients.split(',').map(item => item.trim());
              } else if (selectedRecipe.ingredients && typeof selectedRecipe.ingredients === 'object') {
                ingredientsList = Object.values(selectedRecipe.ingredients).map(item => item.trim());
              }
              
              const filteredIngredients = ingredientsList.filter(ing => ing && String(ing).trim());
              
              if (filteredIngredients.length === 0) {
                return <p className="text-gray-500 italic">No ingredients available.</p>;
              }
              
              return (
                // Use a two-column layout for longer lists
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 list-none p-0">
                  {filteredIngredients.map((ing, i) => (
                    <li key={i} className="text-gray-700 flex items-start">
                      <span className="text-pink-600 mr-2 mt-1"><Dot size={18} /></span>
                      {ing}
                    </li>
                  ))}
                </ul>
              );
            } catch (error) {
              return <p className="text-red-500 italic">Error displaying ingredients.</p>;
            }
          })()}
        </div>
        
        {/* INSTRUCTIONS SECTION */}
        <div className="mb-10">
          <h3 className="font-extrabold text-2xl text-gray-800 mb-4 flex items-center gap-2">
            <ListOrdered size={24} className="text-pink-600" /> Instructions
          </h3>
          {/* Using text-base for better readability */}
          <p className="text-base text-gray-700 whitespace-pre-line leading-relaxed">
            {selectedRecipe.instructions || 'No detailed instructions available.'}
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={() => handleEdit(selectedRecipe)}
            className="px-6 py-2.5 bg-pink-600 text-white font-semibold rounded-lg hover:bg-pink-700 transition duration-150 shadow-md flex items-center gap-2"
          >
            <Edit2 size={20} /> Edit Recipe
          </button>
          <button
            onClick={() => handleDeleteRecipe(selectedRecipe.id)}
            className="px-6 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-150 shadow-md flex items-center gap-2"
          >
            <Trash2 size={20} /> Delete Recipe
          </button>
        </div>
        
      </div>
    </div>
  </div>
)}
 </div>
  </div>
  );
};

export default RecipeAdminPortal;