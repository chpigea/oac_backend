<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                version="1.0">

  <xsl:output method="text" encoding="UTF-8"/>

  <xsl:param name="prefix"/>

  <!-- Prendi il prefix e passa ai vocabolari -->
  <xsl:template match="/vocabularies">
    <!--
    <xsl:variable name="prefix" select="prefix/@value"/>
    -->
    
    <xsl:apply-templates select="vocabulary">
      <xsl:with-param name="prefix" select="concat($prefix,'/vocabularies')"/>
    </xsl:apply-templates>
  </xsl:template>

  <!-- Vocabolario -->
  <xsl:template match="vocabulary">
    <xsl:param name="prefix"/>

    <!-- Recupero classe, di default crm:E55_Type -->
    <xsl:variable name="type-class" select="normalize-space(@class)"/>
    <!-- xsl:variable name="type" select="'crm:E55_Type'"/ -->

    <!-- xsl:variable name="type">
    <xsl:choose>
      <xsl:when test="string-length($type-class) &gt; 0">
        <xsl:value-of select="normalize-space($type-class)"/>
      </xsl:when>
      <xsl:otherwise>crm:E55_Type</xsl:otherwise>
    </xsl:choose>
    </xsl:variable -->

    <xsl:variable name="type">
      <xsl:if test="string-length($type-class) = 0">
        <xsl:value-of select="'crm:E55_Type'"/> 
      </xsl:if>
      <xsl:if test="not(string-length($type-class)) = 0">
        <xsl:value-of select="concat($type-class, ' ')"/>   
      </xsl:if>
    </xsl:variable>

    <xsl:variable name="vocab-id" select="normalize-space(@id)"/>
    <xsl:apply-templates select="term">
      <xsl:with-param name="path" select="concat('http://', $prefix, $vocab-id)"/>
      <xsl:with-param name="type" select="concat($type, ' ')"/>
    </xsl:apply-templates>
  </xsl:template>

  <!-- Term ricorsivo -->
  <xsl:template match="term">
    <xsl:param name="path"/>
    <xsl:param name="type"/>
    <xsl:variable name="current-id" select="normalize-space(@id)"/>
    <xsl:variable name="new-path" select="concat($path, '/', $current-id)"/>
    <xsl:variable name="new-type" select="concat($type, ' ')"/>

    <xsl:choose>
      <!-- Se NON ha sub-terms/term -->
      <xsl:when test="not(sub-terms/term)">
        <xsl:for-each select="name">
          <xsl:value-of select="concat('&lt;',$new-path,'&gt;')"/>
          <xsl:text> a </xsl:text>
          <xsl:value-of select="concat($new-type, ' ')"/>
          <xsl:text> rdfs:label "</xsl:text>
          <xsl:value-of select="."/>
          <xsl:text>"@</xsl:text>
          <xsl:value-of select="@lang"/>
          <xsl:text> ; crm:P127_has_broader_term </xsl:text>
          <xsl:value-of select="concat('&lt;',$path,'&gt;')"/>
          <xsl:text> . &#10;</xsl:text>
        </xsl:for-each>
      </xsl:when>
      <xsl:otherwise>
        
        <xsl:variable name="cid" select="normalize-space(@id)"/>
        <xsl:variable name="npath" select="concat($path, '/', $current-id)"/>

        <xsl:for-each select="name">
          <xsl:value-of select="concat('&lt;',$npath,'&gt;')"/>
          <xsl:text> a </xsl:text>
          <xsl:value-of select="concat($new-type, ' ')"/>
          <xsl:text> rdfs:label "</xsl:text>
          <xsl:value-of select="."/>
          <xsl:text>"@</xsl:text>
          <xsl:value-of select="@lang"/>
          <xsl:text> ; crm:P127_has_broader_term </xsl:text>
          <xsl:value-of select="concat('&lt;',$path,'&gt;')"/>
          <xsl:text> . &#10;</xsl:text>
        </xsl:for-each>

        <xsl:apply-templates select="sub-terms/term">
          <xsl:with-param name="prev-path" select="$path"/>
          <xsl:with-param name="path" select="$new-path"/>
          <xsl:with-param name="type" select="$type"/>
        </xsl:apply-templates>
      </xsl:otherwise>
    </xsl:choose>
  </xsl:template>

</xsl:stylesheet>