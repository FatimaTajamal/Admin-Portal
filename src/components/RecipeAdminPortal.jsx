import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Edit2, Trash2, Eye, Download, RefreshCw, XCircle, CheckCircle, 
  ChevronLeft, ChevronRight, LayoutDashboard, Utensils, BookOpen, PieChart, 
  List, Clock, Zap, Database, Globe, X, Image, CookingPot, Users, Gauge, Dot, 
  ListOrdered, LogOut
} from 'lucide-react';

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

  // Get token from localStorage
  const getToken = () => {
    return localStorage.getItem('adminToken');
  };

  // Create headers with token
  const getAuthHeaders = () => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return !!getToken();
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    window.location.href = '/login'; // Redirect to login page
  };

  const getSourceBadge = (source) => {
    const normalizedSource = source === 'cookbook' ? 'Database' : source.charAt(0).toUpperCase() + source.slice(1);
    const isDatabase = normalizedSource === 'Database';
    const classes = `px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 whitespace-nowrap ${
        isDatabase ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
    }`;
    const Icon = isDatabase ? Database : Zap;
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
    ingredients: '',
    instructions: '',
    source: 'cookbook'
  });

  useEffect(() => {
    if (currentView === 'recipes') {
      fetchPagedRecipes();
    }
    fetchRecipesForStats();
  }, [currentView, currentPage, searchQuery, filterCategory]);

  useEffect(() => {
    if (currentView === 'dashboard') {
      fetchRecipesForStats();
    }
  }, [currentView]);

  const fetchPagedRecipes = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage,
        limit: recipesPerPage,
        search: searchQuery || '',
        category: filterCategory || 'all',
      });

      const url = `${BASE_URL}/api/recipes?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch paged recipes: ${response.status}`);
      }

      const data = await response.json();

      if (!data.recipes || !Array.isArray(data.recipes)) {
        throw new Error('Invalid response format from server');
      }

      const normalized = data.recipes.map(r => ({ 
        ...r, 
        id: r._id || r.id,
        name: r.title || r.name || r.recipe_name || r.recipeName,
        title: r.title || r.name || r.recipe_name || r.recipeName
      }));
      
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
    try {
      const url = `${BASE_URL}/api/recipes/stats`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats recipes');
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data)) {
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
  if (!isAuthenticated()) {
    showNotification('Please login first', 'error');
    return;
  }

  // Validate required fields
  if (!formData.name || !formData.ingredients || !formData.instructions) {
    showNotification('Please fill in all required fields (Name, Ingredients, Instructions)', 'error');
    return;
  }

  setIsLoading(true);
  try {
    const payload = {
      title: formData.name.trim(),
      ingredients: formData.ingredients.split(',').map(i => i.trim()).filter(i => i),
      instructions: formData.instructions.split('\n').map(i => i.trim()).filter(i => i),
      dietType: formData.dietType?.trim() || '',
      cuisine: formData.cuisine?.trim() || '',
      calories: Number(formData.calories) || 0,
      source: formData.source || 'cookbook'
    };

    console.log('=== DEBUG: Recipe Creation ===');
    console.log('1. Base URL:', BASE_URL);
    console.log('2. Full URL:', `${BASE_URL}/api/recipes`);
    console.log('3. Auth Token:', getToken() ? 'Present (length: ' + getToken().length + ')' : 'MISSING');
    console.log('4. Payload:', JSON.stringify(payload, null, 2));
    console.log('5. Headers:', getAuthHeaders());

    const response = await fetch(`${BASE_URL}/api/recipes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });

    console.log('6. Response Status:', response.status);
    console.log('7. Response OK:', response.ok);

    if (!response.ok) {
      let errorMessage = 'Failed to add recipe';
      let errorDetails = null;
      
      try {
        const errorData = await response.json();
        console.log('8. Error Response (JSON):', errorData);
        errorDetails = errorData;
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } catch (e) {
        const errorText = await response.text();
        console.log('8. Error Response (TEXT):', errorText);
        errorMessage = errorText || `Server error (${response.status})`;
      }
      
      // Log full error details
      console.error('=== FULL ERROR DETAILS ===');
      console.error('Status:', response.status);
      console.error('Status Text:', response.statusText);
      console.error('Error Message:', errorMessage);
      console.error('Error Details:', errorDetails);
      
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('9. Success! Recipe created:', result);

    await fetchPagedRecipes();
    await fetchRecipesForStats();
    resetForm();
    setCurrentView('recipes');
    showNotification('Recipe added successfully', 'success');
  } catch (error) {
    console.error('=== CATCH BLOCK ERROR ===');
    console.error('Error object:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    showNotification(error.message || 'Failed to add recipe', 'error');
  } finally {
    setIsLoading(false);
  }
};

  const handleUpdateRecipe = async () => {
    if (!isAuthenticated()) {
      showNotification('Please login first', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const recipeId = selectedRecipe._id || selectedRecipe.id;
      const payload = {
        title: formData.name,
        ingredients: formData.ingredients.split(',').map(i => i.trim()),
        instructions: formData.instructions,
        source: formData.source
      };

      const response = await fetch(`${BASE_URL}/api/recipes/${recipeId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update recipe');
      }

      await fetchPagedRecipes();
      await fetchRecipesForStats();
      resetForm();
      setCurrentView('recipes');
      showNotification('Recipe updated successfully', 'success');
    } catch (error) {
      console.error('Error updating recipe:', error);
      showNotification(error.message || 'Failed to update recipe', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecipe = async (id) => {
    if (!isAuthenticated()) {
      showNotification('Please login first', 'error');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this recipe?')) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/api/recipes/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete recipe');
      }
      
      await fetchPagedRecipes();
      await fetchRecipesForStats();
      showNotification('Recipe deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting recipe:', error);
      showNotification(error.message || 'Failed to delete recipe', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (recipe) => {
    const normalizedRecipe = {
      ...recipe,
      name: recipe.name || recipe.title,
      title: recipe.title || recipe.name
    };
    
    let fullRecipe = normalizedRecipe;
    if (!normalizedRecipe.ingredients || !normalizedRecipe.instructions) {
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
          await fetchRecipesForStats();
          return;
        }
      } catch (error) {
        console.error('Error fetching full recipe:', error);
      }
    }

    setSelectedRecipe(normalizedRecipe);
    setCurrentView('view');
    await fetchRecipesForStats();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      ingredients: '',
      instructions: '',
      source: 'cookbook'
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-gradient-to-r from-purple-500 to-purple-600' : 'bg-gradient-to-r from-red-500 to-red-600'
        } text-white backdrop-blur-sm border border-white/20`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
          {notification.message}
        </div>
      )}

      <header className="bg-white/90 backdrop-blur-lg shadow-2xl border-b border-purple-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('recipes')}>
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
              <Utensils size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
                Recipe Admin Portal
              </h1>
              <p className="text-sm text-gray-600 mt-0.5">Manage your culinary collection with elegance</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { fetchPagedRecipes(); fetchRecipesForStats(); }} 
              className="px-4 py-2 text-purple-700 hover:bg-purple-50 rounded-xl transition duration-200 flex items-center gap-2 border border-purple-200 shadow-sm"
              title="Refresh All Data"
            >
              <RefreshCw size={18} />
            </button>
            
            <button 
              onClick={exportData} 
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-xl transition duration-200 flex items-center gap-2 shadow-lg"
              title="Export Data"
            >
              <Download size={18} /> Export
            </button>

            <button 
              onClick={handleLogout} 
              className="px-5 py-2 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition duration-200 flex items-center gap-2 shadow-lg"
              title="Logout"
            >
              <LogOut size={18} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <nav className="flex gap-2 mb-6">
          <button
            onClick={() => {
              setCurrentView('dashboard');
              fetchRecipesForStats();
            }}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-md ${
              currentView === 'dashboard'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50'
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-purple-100'
            }`}
          >
            <LayoutDashboard size={18} className="inline mr-2" />
            Dashboard
          </button>

          <button
            onClick={() => { 
              setCurrentView('recipes'); 
              setCurrentPage(1);
            }}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-md ${
              currentView === 'recipes' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50' 
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-purple-100'
            }`}
          >
            <BookOpen size={18} className="inline mr-2" />
            All Recipes
          </button>

          <button
            onClick={() => { resetForm(); setCurrentView('add'); }}
            className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-md ${
              currentView === 'add' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/50' 
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-purple-100'
            }`}
          >
            <Plus size={18} className="inline mr-2" />
            Add Recipe
          </button>
        </nav>

        {currentView === 'dashboard' && (
          <div className="p-6">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8 flex items-center gap-2">
              <LayoutDashboard size={32} className="text-purple-600" /> Dashboard Overview
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <h2 className="text-xl font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <PieChart size={20} className="text-purple-600"/> Performance Metrics
                </h2>
                
                <div className="space-y-4">
                  <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-purple-100 flex items-center justify-between hover:shadow-2xl transition-shadow duration-200">
                    <div>
                      <div className="text-sm font-medium text-gray-600">Total Recipes</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mt-1">
                        {stats.total}
                      </div>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                      <Utensils size={32} className="text-white" />
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-purple-100 flex items-center justify-between hover:shadow-2xl transition-shadow duration-200">
                    <div>
                      <div className="text-sm font-medium text-gray-600">Database Count</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mt-1">
                        {stats.dbRecipes}
                      </div>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                      <Database size={32} className="text-white" />
                    </div>
                  </div>

                  <div className="bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-purple-100 flex items-center justify-between hover:shadow-2xl transition-shadow duration-200">
                    <div>
                      <div className="text-sm font-medium text-gray-600">API Count</div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mt-1">
                        {stats.apiRecipes}
                      </div>
                    </div>
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl">
                      <Globe size={32} className="text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-purple-100">
                  <div className="flex justify-between items-center mb-6 border-b border-purple-100 pb-4">
                    <h2 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                      <List size={24} className="text-purple-600" /> Recent Recipes
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {recipes.slice(0, 5).length > 0 ? (
                      recipes.slice(0, 5).map(recipe => (
                        <div 
                          key={recipe.id} 
                          className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-purple-50 rounded-xl border border-purple-100 hover:shadow-lg transition-all duration-200 cursor-pointer"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg">
                              <Utensils size={20} className="text-white" />
                            </div>
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
                              className="text-purple-600 hover:text-purple-800 p-2 rounded-full transition bg-purple-100/50 hover:bg-purple-100" 
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500 italic bg-purple-50 rounded-xl border border-dashed border-purple-200">
                        <BookOpen size={24} className="mx-auto mb-2 text-purple-400" />
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
          <div className="p-8">
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8 tracking-tight">
              Recipe Catalog
            </h1>

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-100 p-5 mb-8 flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400" size={20} />
                <input
                  type="text"
                  placeholder="Search recipes by name..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange(setSearchQuery, e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition duration-200 shadow-sm bg-white"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setCurrentView('add')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl hover:shadow-xl transition duration-200 flex items-center gap-2 shadow-lg"
                >
                  <Plus size={20} /> Add New Recipe
                </button>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-purple-100 overflow-hidden">
              {isLoading ? (
                <div className="text-center p-16 text-xl text-purple-600 flex items-center justify-center gap-3">
                  <RefreshCw size={24} className="animate-spin text-purple-600" /> Loading recipes, please wait...
                </div>
              ) : pagedRecipes.length === 0 ? (
                <div className="text-center p-16 text-lg text-gray-500">
                  <BookOpen size={40} className="mx-auto mb-4 text-purple-400" />
                  <p className="font-medium">No recipes found matching your criteria.</p>
                  <p className="text-sm mt-1">Try adjusting your search terms or adding a new recipe.</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-purple-100">
                  <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-bold text-purple-900 uppercase tracking-wider">Name</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-purple-900 uppercase tracking-wider hidden sm:table-cell">Difficulty</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-purple-900 uppercase tracking-wider hidden sm:table-cell">Source</th>
                      <th className="px-6 py-4 text-center text-sm font-bold text-purple-900 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-purple-50">
                    {pagedRecipes.map(recipe => (
                      <tr key={recipe.id} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition duration-150">
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{recipe.name || recipe.title || 'Untitled'}</td>
                        
                        <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            recipe.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' :
                            recipe.difficulty === 'Medium' ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                            'bg-red-100 text-red-700 border border-red-300'
                          }`}>
                            {recipe.difficulty}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                          {getSourceBadge(recipe.source || 'cookbook')}
                        </td>
                        
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => handleView(recipe)} className="text-purple-600 hover:text-purple-800 p-2 rounded-full hover:bg-purple-100 transition duration-150" title="View Details">
                              <Eye size={18} />
                            </button>
                            <button onClick={() => handleEdit(recipe)} className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-100 transition duration-150" title="Edit Recipe">
                              <Edit2 size={18} />
                            </button>
                            <button onClick={() => handleDeleteRecipe(recipe.id)} className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100 transition duration-150" title="Delete Recipe">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            {pagedRecipes.length > 0 && (
              <div className="flex justify-between items-center bg-white/80 backdrop-blur-sm p-5 mt-8 rounded-2xl shadow-2xl border border-purple-100">
                <div className="text-base text-gray-600">
                  Showing <span className="font-bold text-purple-700">{((currentPage - 1) * recipesPerPage) + 1}</span> to <span className="font-bold text-purple-700">{Math.min(currentPage * recipesPerPage, totalRecipesCount)}</span> of <span className="font-bold text-purple-700">{totalRecipesCount}</span> total recipes
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
          
          {/* 7. Source */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Source <span className="text-red-500">*</span></label>
            <select
              required
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-150 bg-white appearance-none"
            >
              <option value="database">cookbook</option>
              <option value="api">gemini</option>
            </select>
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
  <div className="p-8 bg-gray-50 min-h-screen-minus-header">
    <div className="bg-white rounded-xl shadow-2xl border border-gray-100 max-w-5xl mx-auto overflow-hidden">
      
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
          {/* You can add prep/cook/servings/difficulty badges here if needed */}
        </div>
        
        {/* INGREDIENTS SECTION */}
        <div className="mb-10 p-6 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="font-extrabold text-2xl text-gray-800 mb-4 flex items-center gap-2">
            <Utensils size={24} className="text-pink-600" /> Ingredients
          </h3>
          {(() => {
            try {
              let ingredientsList = [];
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