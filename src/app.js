document.addEventListener('DOMContentLoaded', () => {
    console.log('Document loaded');
    const token = prompt("Please enter your token:");
  
    if (!token) {
      alert("Token is required to receive notifications.");
      throw new Error("Token is required");
    }
  
    function getUserIdFromToken(token) {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
  
      const payload = JSON.parse(jsonPayload);
      return payload.id;
    }
  
    const userId = getUserIdFromToken(token);
  
    const socket = io('http://localhost:5000');
  
    socket.emit('join', userId);
  
    socket.on('productAdded', handleNotification);
    socket.on('productUpdated', handleNotification);
    socket.on('productStatusChanged', handleNotification);
    socket.on('productExpired', handleNotification);
    socket.on('productRemoved', handleNotification);
    socket.on('productBought', handleNotification);
  
    let notificationCount = 0;
  
    function handleNotification(message) {
      console.log('Real-time notification received:', message);
      updateBadgeCount(1);
      fetchNotifications();
    }
  
    function displayNotification(notification, isRead) {
      const notificationsDiv = document.getElementById('notifications');
      const notificationDiv = document.createElement('div');
      notificationDiv.className = `notification ${isRead ? '' : 'unread'}`;
      notificationDiv.innerText = notification.message;
      if (!isRead) {
        const markReadIcon = document.createElement('span');
        markReadIcon.className = 'mark-read';
        markReadIcon.innerText = '✓';
        markReadIcon.addEventListener('click', () => markNotificationAsRead(notification.id, notificationDiv));
        notificationDiv.appendChild(markReadIcon);
      }
      notificationsDiv.appendChild(notificationDiv);
    }
  
    function updateBadgeCount(increment) {
      notificationCount += increment;
      const badge = document.getElementById('notification-badge');
      badge.innerText = notificationCount;
      badge.style.display = notificationCount > 0 ? 'block' : 'none';
    }
  
    async function fetchNotifications() {
      console.log('Fetching notifications'); 
      try {
        const response = await fetch('http://localhost:5000/api/user/user-get-notifications', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
  
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
  
        const data = await response.json();
  
        if (!data.data || !Array.isArray(data.data.notifications)) {
          throw new Error('Invalid response format');
        }
  
        const notifications = data.data.notifications;
        const notificationsDiv = document.getElementById('notifications');
        notificationsDiv.innerHTML = '<h2>Notifications</h2><div id="mark-all-read" style="display: none;">Mark all as read</div>';
  
        notifications
          .sort((a, b) => a.isRead - b.isRead || new Date(b.createdAt) - new Date(a.createdAt))
          .forEach(notification => displayNotification(notification, notification.isRead));
  
        notificationCount = notifications.filter(n => !n.isRead).length;
        updateBadgeCount(0);
  
        const markAllReadButton = document.getElementById('mark-all-read');
        if (markAllReadButton) {
          markAllReadButton.style.display = notificationCount > 0 ? 'block' : 'none';
          markAllReadButton.addEventListener('click', markAllAsRead);
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }
    }
  
    fetchNotifications();
  
    document.getElementById('notification-icon').addEventListener('click', fetchNotifications);
  
    async function markAllAsRead() {
      console.log('Mark all as read button clicked'); 
      try {
        const response = await fetch('http://localhost:5000/api/user/user-mark-all-notifications', {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
  
        if (response.ok) {
          console.log('All notifications marked as read'); 
          const notificationElements = document.querySelectorAll('.notification.unread');
          notificationElements.forEach(notificationDiv => {
            notificationDiv.classList.remove('unread');
            const markReadIcon = notificationDiv.querySelector('.mark-read');
            if (markReadIcon) {
              markReadIcon.remove();
            }
          });
          notificationCount = 0;
          updateBadgeCount(0);
  
          const markAllReadButton = document.getElementById('mark-all-read');
          if (markAllReadButton) {
            markAllReadButton.style.display = 'none';
          }
        } else {
          console.error('Failed to mark all notifications as read');
        }
      } catch (error) {
        console.error('Error marking all notifications as read:', error);
      }
    }
  
    async function markNotificationAsRead(notificationId, notificationDiv) {
      try {
        const response = await fetch(`http://localhost:5000/api/user/user-mark-notification/${notificationId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          notificationDiv.classList.remove('unread');
          const markReadIcon = notificationDiv.querySelector('.mark-read');
          if (markReadIcon) {
            markReadIcon.remove();
          }
          updateBadgeCount(-1);
        } else {
          console.error('Failed to mark notification as read');
        }
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  });
  